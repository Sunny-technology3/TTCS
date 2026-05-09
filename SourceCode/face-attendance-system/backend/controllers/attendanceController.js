const {
    getSessionAttendanceData,
    getClassAttendanceData,
    autoCheckInService,
    updateAttendanceStatusService,
    markAllPresentService,
} = require("../services/attendance/attendanceService");
const {
    buildSessionAttendanceWorkbook,
} = require("../services/attendance/sessionAttendanceExportService");
const {
    buildClassAttendanceWorkbook
} = require("../services/attendance/classAttendanceExportService");
const asyncHandler = require("../utils/asyncHandler");
const { sendExcelWorkbook } = require("../utils/excel");

const autoCheckIn = asyncHandler(async (req, res) => {
    const result = await autoCheckInService({
        classId: req.query.classId,
        studentId: req.body.studentId,
    });

    return res.json({
        success: true,
        data: result,
    });
});

const getAttendanceBySession = asyncHandler(async (req, res) => {
    const { classId, sessionId } = req.query;
    const { id } = req.user;

    const attendanceData = await getSessionAttendanceData({
        sessionId,
        lecturerId: id,
        classId,
    });

    return res.status(200).json({
        success: true,
        data: attendanceData.rows.map((row) => ({
            _id: row._id,
            fullName: row.fullName,
            studentId: row.studentId,
            checkIn: row.checkIn,
            status: row.status,
        })),
    });
});

const updateAttendanceStatus = asyncHandler(async (req, res) => {
    const result = await updateAttendanceStatusService({
        studentId: req.params.studentId,
        sessionId: req.params.sessionId,
        status: req.body.status,
        lecturerId: req.user.id,
    });

    return res.status(201).json({
        success: true,
        message: "Cập nhật trạng thái điểm danh của sinh viên thành công",
        data: result,
    });
});

const markAllPresent = asyncHandler(async (req, res) => {
    await markAllPresentService({
        classId: req.body.classId,
        sessionId: req.body.sessionId,
    });

    return res.status(200).json({
        success: true,
        message: "Điểm danh tất cả thành công"
    });
});

const exportAttendanceBySession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    const attendanceData = await getSessionAttendanceData({
        sessionId,
        lecturerId: id,
    });

    const workbook = await buildSessionAttendanceWorkbook(
        attendanceData
    );

    await sendExcelWorkbook({
        res,
        workbook,
        fileName: `Kết quả điểm danh - ${attendanceData.session.name || "Phiên học"}.xlsx`,
    });
});

const exportAttendanceByClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { id } = req.user;

    const data = await getClassAttendanceData({
        classId,
        lecturerId: id,
    });

    const workbook = await buildClassAttendanceWorkbook({
        classData: data.classData,
        sessions: data.sessions,
        students: data.students,
        attendanceMap: data.attendanceMap,
    });

    await sendExcelWorkbook({
        res,
        workbook,
        fileName: `Kết quả điểm danh - ${data.classData.name}.xlsx`,
    });
});

module.exports = {
    autoCheckIn,
    getAttendanceBySession,
    updateAttendanceStatus,
    markAllPresent,
    exportAttendanceBySession,
    exportAttendanceByClass,
};
