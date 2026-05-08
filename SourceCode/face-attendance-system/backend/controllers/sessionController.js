const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const Session = require("../models/session");
const Class = require("../models/class");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");
const {
    getSessionAttendanceData,
    fillAttendanceWorksheet,
    formatSessionDate,
    buildAttendanceExportFileName,
} = require("../services/sessionAttendanceService");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const getDetailSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    const sessionData = await Session.findById(sessionId).populate("classId").lean();

    if (!sessionData) {
        throw new AppError(404, "Không tìm thấy phiên học học");
    }

    if (sessionData.classId.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền lấy thông tin phiên học này");
    }

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin phiên học thành công",
        data: sessionData,
    });
});

const createSession = asyncHandler(async (req, res) => {
    const { name, startTime, endTime, classId } = req.body;
    const { id } = req.user;

    if (!name || !startTime || !endTime) {
        throw new AppError(400, "Thiếu thông tin cần thiết");
    }

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
        throw new AppError(400, "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
    }

    const classData = await Class.findById(classId);
    if (!classData) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (classData.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền tạo phiên học trong lớp này");
    }

    const newSession = await Session.create({
        name,
        startTime,
        endTime,
        classId,
        status: "not_started",
    });

    return res.status(201).json({
        success: true,
        message: "Tạo phiên học thành công",
        data: newSession,
    });
});

const updateSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { name, startTime, endTime, status } = req.body;
    const { id } = req.user;

    const session = await Session.findById(sessionId).populate("classId");

    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (session.classId.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền sửa phiên học này");
    }

    const newStart = startTime ?? session.startTime;
    const newEnd = endTime ?? session.endTime;

    if (newStart && newEnd && new Date(newStart) >= new Date(newEnd)) {
        throw new AppError(400, "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
    }

    session.name = name ?? session.name;
    session.startTime = startTime ?? session.startTime;
    session.endTime = endTime ?? session.endTime;
    session.status = status ?? session.status;

    await session.save();

    return res.status(200).json({
        success: true,
        message: "Cập nhật phiên học thành công",
        data: session,
    });
});

const updateSessionStatus = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { status } = req.body;
    const { id } = req.user;

    const session = await Session.findById(sessionId).populate("classId");

    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (session.classId.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền cập nhật trạng thái phiên học này");
    }

    if (status === "in_progress") {
        if (session.status !== "not_started") {
            throw new AppError(400, "Chỉ có thể bắt đầu khi phiên học chưa bắt đầu");
        }

        if (!session.classId.cameraUrl) {
            throw new AppError(400, "Lớp học chưa cấu hình camera");
        }

        const activeSession = await Session.findOne({
            classId: session.classId._id,
            status: "in_progress",
            _id: { $ne: session._id },
        });
        if (activeSession) {
            throw new AppError(400, `Đã có "${activeSession.name}" đang diễn ra`);
        }

        await axios.post("http://localhost:8000/api/attendance/start", {
            classId: session.classId._id,
            cameraUrl: session.classId.cameraUrl,
        });

        session.status = "in_progress";
    }
    else if (status === "finished") {
        if (session.status !== "in_progress") {
            throw new AppError(400, "Chỉ có thể kết thúc khi phiên học đang diễn ra");
        }

        await axios.post("http://localhost:8000/api/attendance/stop", {
            classId: session.classId._id
        });

        session.status = "finished";
    }

    await session.save();

    return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: session,
    });
});

const deleteSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    await runInTransaction(async (session) => {
        const sessionData = await Session.findById(sessionId).populate("classId").session(session);

        if (!sessionData) {
            throw new AppError(404, "Phiên học không tồn tại");
        }

        if (sessionData.classId.lecturerId.toString() !== id.toString()) {
            throw new AppError(403, "Bạn không có quyền xóa phiên học này");
        }

        await Attendance.deleteMany(
            { sessionId },
            { session }
        );
        await Session.findByIdAndDelete(sessionId, { session });
    });

    return res.status(200).json({
        success: true,
        message: "Xóa phiên học thành công",
    });
});

const exportSessionAttendance = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    const attendanceData = await getSessionAttendanceData({
        sessionId,
        lecturerId: id,
    });
    const templatePath = path.join(__dirname, "..", "templates", "attendance-template.xlsx");

    if (!fs.existsSync(templatePath)) {
        throw new AppError(500, "Lỗi máy chủ khi xuất kết quả điểm danh của sinh viên theo buổi học");
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new AppError(500, "Lỗi máy chủ khi xuất kết quả điểm danh của sinh viên theo buổi học");
    }

    fillAttendanceWorksheet({
        worksheet,
        rows: attendanceData.rows,
        studentCount: attendanceData.studentCount,
        className: attendanceData.classData?.name || "",
        sessionName: attendanceData.session.name || "",
        sessionDateText: formatSessionDate(attendanceData.session.startTime),
    });

    const fileName = buildAttendanceExportFileName(attendanceData.session.name);
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="attendance-export.xlsx"; filename*=UTF-8''${encodedFileName}`
    );

    await workbook.xlsx.write(res);
    res.end();
});

module.exports = {
    getDetailSession,
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession,
    exportSessionAttendance,
};
