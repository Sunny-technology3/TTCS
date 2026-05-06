const Session = require("../models/session");
const Student = require("../models/student");
const Attendance = require("../models/attendance");

const ATTENDANCE_STATUS_LABELS = {
    present: "Có mặt",
    late: "Đi muộn",
    absent: "Vắng mặt",
};

const DEFAULT_START_ROW = 5;

class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
    }
}

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

const formatSessionDate = (value) => {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const pad = (number) => String(number).padStart(2, "0");

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const buildAttendanceExportFileName = (sessionName) => {
    const normalizedSessionName = String(sessionName || "").trim();

    return `Kết quả điểm danh - ${normalizedSessionName || "Phiên học"}.xlsx`;
};

const normalizeTemplateHeadingText = (value) => String(value || "").trim().toUpperCase();

const getSessionAttendanceData = async ({
    sessionId,
    lecturerId,
    classId,
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
        .sort({ studentId: 1, fullName: 1 })
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
            checkIn: attendance?.checkIn || null,
            checkInText: formatCheckIn(attendance?.checkIn),
            status,
            statusText: ATTENDANCE_STATUS_LABELS[status] || status,
        };
    });

    return {
        session,
        classData: session.classId,
        studentCount: rows.length,
        rows,
    };
};

const fillAttendanceWorksheet = ({
    worksheet,
    rows,
    studentCount,
    className = "",
    sessionName = "",
    sessionDateText = "",
    startRow = DEFAULT_START_ROW,
}) => {
    const sessionHeaderCell = worksheet.getCell(1, 1);
    const normalizedClassName = normalizeTemplateHeadingText(className);
    const normalizedSessionName = normalizeTemplateHeadingText(sessionName);

    if (typeof sessionHeaderCell.value === "string") {
        sessionHeaderCell.value = sessionHeaderCell.value
            .replaceAll("{className}", normalizedClassName)
            .replaceAll("{sessionName}", normalizedSessionName)
            .replaceAll("{sessionDate}", sessionDateText);
    }

    const summaryCell = worksheet.getCell(3, 1);

    summaryCell.value = `Danh sách gồm ${studentCount} sinh viên`;
    summaryCell.alignment = {
        ...(summaryCell.alignment || {}),
        horizontal: "left",
    };

    rows.forEach((row, index) => {
        const worksheetRow = startRow + index;

        worksheet.getCell(worksheetRow, 1).value = row.index;
        worksheet.getCell(worksheetRow, 2).value = row.studentId;
        worksheet.getCell(worksheetRow, 3).value = row.fullName;
        worksheet.getCell(worksheetRow, 4).value = row.checkInText;
        worksheet.getCell(worksheetRow, 5).value = row.statusText;
    });
};

module.exports = {
    AppError,
    getSessionAttendanceData,
    fillAttendanceWorksheet,
    formatSessionDate,
    buildAttendanceExportFileName,
    normalizeTemplateHeadingText,
};
