const Session = require("../../models/session");
const Student = require("../../models/student");
const Attendance = require("../../models/attendance");
const Class = require("../../models/class");
const AppError = require("../../utils/appError");

const ATTENDANCE_STATUS_LABELS = {
    present: "Có mặt",
    late: "Đi muộn",
    absent: "Vắng mặt",
};

const DEFAULT_START_ROW = 5;

const formatCheckIn = (value) => {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const pad = (number) => String(number).padStart(2, "0");

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Lấy kết quả điểm danh theo từng buổi học
const getSessionAttendanceData = async ({
    sessionId,
    lecturerId,
    classId,
    status,
}) => {
    const session = await Session.findById(sessionId).populate("classId").lean();

    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (!session.classId) {
        throw new AppError(404, "Không tìm thấy lớp học của phiên học");
    }

    if (classId && String(session.classId._id) !== String(classId)) {
        throw new AppError(400, "Phiên học không thuộc lớp học được yêu cầu");
    }

    if (lecturerId && String(session.classId.lecturerId) !== String(lecturerId)) {
        throw new AppError(403, "Bạn không có quyền xem dữ liệu điểm danh của phiên học này");
    }

    const students = await Student.find({ classId: session.classId._id })
        .sort({ studentId: 1, fullName: 1, avatarUrl: 1 })
        .lean();

    const attendances = await Attendance.find({ sessionId }).lean();
    const attendanceMap = new Map(
        attendances.map((attendance) => [String(attendance.studentId), attendance])
    );

    const rows = students.map((student, index) => {
        const attendance = attendanceMap.get(String(student._id));
        const status = attendance?.status || "absent";

        return {
            _id: student._id,
            index: index + 1,
            fullName: student.fullName,
            studentId: student.studentId,
            avatarUrl: student.avatarUrl,
            checkIn: attendance?.checkIn || null,
            checkInText: formatCheckIn(attendance?.checkIn),
            status,
            statusText: ATTENDANCE_STATUS_LABELS[status] || status,
        };
    });

    let resultRows = rows;

    if (status) {
        resultRows = rows.filter((r) => r.status === status);
    }

    return {
        session,
        classData: session.classId,
        studentCount: resultRows.length,
        rows: resultRows,
    };
};

// Lấy kết quả điểm danh theo từng lớp học
const getClassAttendanceData = async ({ classId, lecturerId }) => {
    const classData = await Class.findById(classId).lean();

    if (!classData) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (lecturerId && String(classData.lecturerId) !== String(lecturerId)) {
        throw new AppError(403, "Bạn không có quyền xem lớp học này");
    }

    const sessions = await Session.find({ classId })
        .sort({ startTime: 1 })
        .lean();

    const students = await Student.find({ classId })
        .sort({ studentId: 1 })
        .lean();

    const attendances = await Attendance.find({
        sessionId: { $in: sessions.map(s => s._id) }
    }).lean();

    const attendanceMap = new Map();

    for (const a of attendances) {
        attendanceMap.set(
            `${a.studentId}_${a.sessionId}`,
            a
        );
    }

    return {
        classData,
        sessions,
        students,
        attendanceMap,
    };
};

const autoCheckInService = async ({ classId, studentId }) => {
    const classData = await Class.findById(classId);
    if (!classData) {
        throw new AppError(404, "Lớp học không tồn tại");
    }

    const session = await Session.findOne({
        classId,
        status: "in_progress",
    });
    if (!session) {
        throw new AppError(404, "Không có buổi học đang diễn ra");
    }

    let attendance = await Attendance.findOne({
        studentId,
        sessionId: session._id,
    });

    if (attendance && attendance.checkIn) {
        return res.json({
            success: true,
            message: "Đã điểm danh",
        });
    }

    const now = new Date();
    const lateThreshold = 10 * 60 * 1000;

    let status = "present";

    if (now - session.startTime > lateThreshold) {
        status = "late";
    }

    if (!attendance) {
        attendance = await Attendance.create({
            studentId,
            sessionId: session._id,
            checkIn: now,
            status,
        });
    }

    return attendance;
};

const updateAttendanceStatusService = async ({ studentId, sessionId, status, lecturerId }) => {
    const session = await Session.findById(sessionId).populate("classId");
    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (session.classId.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền cập nhật trạng thái phiên học này");
    }

    if (session.status === "finished") {
        throw new AppError(
            400,
            "Phiên học đã kết thúc, không thể cập nhật điểm danh"
        );
    }

    const student = await Student.findById(studentId);
    if (!student) {
        throw new AppError(404, "Không tìm thấy sinh viên");
    }

    let attendance = await Attendance.findOne({ sessionId, studentId });
    if (attendance) {
        attendance.status = status;

        attendance.checkIn = new Date();

        await attendance.save();
    } else {
        attendance = await Attendance.create({
            studentId,
            sessionId,
            checkIn: new Date(),
            status,
        });
    }

    const result = await Attendance.create({
        studentId,
        sessionId,
        checkIn: new Date(),
        status,
    });

    return {
        _id: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        checkIn: result.checkIn,
        status: result.status,
    };
};

const markAllPresentService = async ({ classId, sessionId }) => {
    const students = await Student.find({ classId });

    // const bulkOps = students.map(student => ({
    //     updateOne: {
    //         filter: {
    //             studentId: student._id,
    //             sessionId
    //         },
    //         update: {
    //             studentId: student._id,
    //             sessionId,
    //             checkIn: new Date(),
    //             status: "present"
    //         },
    //         upsert: true
    //     }
    // }));

    const bulkOps = [];

    for (const student of students) {
        const attendance = await Attendance.findOne({
            studentId: student._id,
            sessionId
        });

        if (!attendance) {
            bulkOps.push({
                insertOne: {
                    document: {
                        studentId: student._id,
                        sessionId,
                        checkIn: new Date(),
                        status: "present"
                    }
                }
            });
        }
    }

    if (bulkOps.length > 0) {
        await Attendance.bulkWrite(bulkOps);
    }
};

module.exports = {
    getSessionAttendanceData,
    getClassAttendanceData,
    autoCheckInService,
    updateAttendanceStatusService,
    markAllPresentService,
};
