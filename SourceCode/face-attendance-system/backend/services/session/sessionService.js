const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const XLSX = require("xlsx");
const dayjs = require("dayjs");
const Session = require("../../models/session");
const Class = require("../../models/class");
const Attendance = require("../../models/attendance");
const { runInTransaction } = require("../../utils/runInTransaction");
const AppError = require("../../utils/appError");

const getDetailSessionService = async ({ sessionId, lecturerId }) => {
    const sessionData = await Session.findById(sessionId).populate("classId").lean();
    if (!sessionData) {
        throw new AppError(404, "Không tìm thấy phiên học học");
    }

    if (sessionData.classId.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền lấy thông tin phiên học này");
    }

    return sessionData;
};

const createSessionService = async ({ name, startTime, endTime, classId, lecturerId }) => {
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

    if (classData.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền tạo phiên học trong lớp này");
    }

    const newSession = await Session.create({
        name,
        startTime,
        endTime,
        classId,
        status: "not_started",
    });

    return newSession;
};

const updateSessionService = async ({ sessionId, name, startTime, endTime, status, lecturerId }) => {
    const session = await Session.findById(sessionId).populate("classId");
    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (session.status !== "not_started") {
        const message =
            session.status === "started"
                ? "Buổi học đã bắt đầu, không thể chỉnh sửa"
                : "Buổi học đã kết thúc, không thể chỉnh sửa";

        throw new AppError(400, message);
    }

    if (session.classId.lecturerId.toString() !== lecturerId.toString()) {
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

    return session;
};

const updateSessionStatusService = async ({ sessionId, status, lecturerId }) => {
    const session = await Session.findById(sessionId).populate("classId");
    if (!session) {
        throw new AppError(404, "Không tìm thấy phiên học");
    }

    if (session.classId.lecturerId.toString() !== lecturerId.toString()) {
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

    return session;
};

const deleteSessionService = async ({ sessionId, lecturerId }) => {
    await runInTransaction(async (session) => {
        const sessionData = await Session.findById(sessionId).populate("classId").session(session);

        if (!sessionData) {
            throw new AppError(404, "Phiên học không tồn tại");
        }

        if (sessionData.classId.lecturerId.toString() !== lecturerId.toString()) {
            throw new AppError(403, "Bạn không có quyền xóa phiên học này");
        }

        await Attendance.deleteMany(
            { sessionId },
            { session }
        );
        await Session.findByIdAndDelete(sessionId, { session });
    });
};

const importSessionsService = async ({
    file,
    classId,
    lecturerId,
}) => {

    if (!file) {
        throw new AppError(400, "Vui lòng upload file Excel");
    }

    const classData = await Class.findById(classId);

    if (!classData) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (classData.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(
            403,
            "Bạn không có quyền import phiên học cho lớp này"
        );
    }

    const workbook = XLSX.read(file.buffer, {
        type: "buffer"
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(
        worksheet,
        {
            range: 2,
            raw: false,
        }
    );

    if (!rows.length) {
        throw new AppError(400, "File Excel không có dữ liệu");
    }

    const sessions = [];

    for (const row of rows) {
        const name = row["Tên buổi"];
        const startTimeValue = row["Thời gian bắt đầu"];
        const endTimeValue = row["Thời gian kết thúc"];

        if (!name || !startTimeValue || !endTimeValue) {
            throw new AppError(
                400,
                "File Excel thiếu dữ liệu bắt buộc"
            );
        }

        const startTime = new Date(startTimeValue);
        const endTime = new Date(endTimeValue);

        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            throw new AppError(
                400,
                `Phiên "${name}" có thời gian không hợp lệ`
            );
        }

        if (startTime >= endTime) {
            throw new AppError(
                400,
                `Phiên "${name}" có thời gian không hợp lệ`
            );
        }

        sessions.push({
            name,
            startTime,
            endTime,
            classId,
            status: "not_started",
        });
    }

    const insertedSessions = await Session.insertMany(sessions);

    return insertedSessions;
};

const downloadSessionTemplateService = async () => {
    const templatePath = path.join(
        __dirname,
        "..",
        "..",
        "templates",
        "session-template.xlsx"
    );

    if (!fs.existsSync(templatePath)) {
        throw new AppError(404, "Không tìm thấy file mẫu");
    }

    return templatePath;
};

module.exports = {
    getDetailSessionService,
    createSessionService,
    updateSessionService,
    updateSessionStatusService,
    deleteSessionService,
    importSessionsService,
    downloadSessionTemplateService,
};
