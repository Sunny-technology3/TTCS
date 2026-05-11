const asyncHandler = require("../utils/asyncHandler");
const {
    getDetailSessionService,
    createSessionService, 
    updateSessionService, 
    updateSessionStatusService,
    deleteSessionService,
    importSessionsService,
    downloadSessionTemplateService,
} = require("../services/session/sessionService");

const getDetailSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    const sessionData = await getDetailSessionService({ sessionId, lecturerId: id });

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin phiên học thành công",
        data: sessionData,
    });
});

const createSession = asyncHandler(async (req, res) => {
    const { name, startTime, endTime, classId } = req.body;
    const { id } = req.user;

    const newSession = await createSessionService({
        name,
        startTime,
        endTime,
        classId,
        lecturerId: id,
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

    const session = await updateSessionService({
        sessionId,
        name,
        startTime,
        endTime,
        status,
        lecturerId: id,
    });

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

    const session = await updateSessionStatusService({
        sessionId, status, lecturerId: id,
    });

    return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái thành công",
        data: session,
    });
});

const deleteSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    await deleteSessionService({ sessionId, lecturerId: id });

    return res.status(200).json({
        success: true,
        message: "Xóa phiên học thành công",
    });
});

const importSessions = asyncHandler(async (req, res) => {
    const { classId } = req.body;
    const { id } = req.user;

    const sessions = await importSessionsService({
        file: req.file,
        classId,
        lecturerId: id,
    });

    return res.status(201).json({
        success: true,
        message: "Import phiên học thành công",
        data: sessions,
    });
});

const downloadSessionTemplate = asyncHandler(async (req, res) => {
    const templatePath = await downloadSessionTemplateService();

    return res.download(
        templatePath,
        "session-template.xlsx"
    );
});

module.exports = {
    getDetailSession,
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession,
    importSessions,
    downloadSessionTemplate,
};
