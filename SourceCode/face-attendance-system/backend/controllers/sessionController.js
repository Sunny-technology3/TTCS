const axios = require("axios");
const Session = require("../models/session");
const Class = require("../models/class");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");

const getDetailSession = async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    try {
        const sessionData = await Session.findById(sessionId).populate("classId").lean();

        if (!sessionData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiên học học",
            });
        }

        if (sessionData.classId.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền lấy thông tin phiên học này",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lấy thông tin phiên học thành công",
            data: sessionData,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy thông tin phiên học",
        });
    }
};

const createSession = async (req, res) => {
    const { name, startTime, endTime, classId } = req.body;
    const { id } = req.user;

    try {
        if (!name || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin cần thiết",
            });
        }

        if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
            return res.status(400).json({
                success: false,
                message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc",
            });
        }

        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học",
            });
        }

        if (classData.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền tạo phiên học trong lớp này",
            });
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi thêm phiên học",
        });
    }
};

const updateSession = async (req, res) => {
    const { sessionId } = req.params;
    const { name, startTime, endTime, status } = req.body;
    const { id } = req.user;

    try {
        const session = await Session.findById(sessionId).populate("classId");

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiên học",
            });
        }

        if (session.classId.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền sửa phiên học này",
            });
        }

        const newStart = startTime ?? session.startTime;
        const newEnd = endTime ?? session.endTime;

        if (newStart && newEnd && new Date(newStart) >= new Date(newEnd)) {
            return res.status(400).json({
                success: false,
                message: "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc",
            });
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
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật thông tin phiên học",
        });
    }
};

const updateSessionStatus = async (req, res) => {
    const { sessionId } = req.params;
    const { status } = req.body;
    const { id } = req.user;

    try {
        const session = await Session.findById(sessionId).populate("classId");

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiên học",
            });
        }

        if (session.classId.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền cập nhật trạng thái phiên học này",
            });
        }

        if (status === "in_progress") {
            if (session.status !== "not_started") {
                return res.status(400).json({
                    success: false,
                    message: "Chỉ có thể bắt đầu khi phiên học chưa bắt đầu",
                });
            }

            if (!session.classId.cameraUrl) {
                return res.status(400).json({
                    success: false,
                    message: "Lớp học chưa cấu hình camera",
                });
            }

            const activeSession = await Session.findOne({
                classId: session.classId._id,
                status: "in_progress",
                _id: { $ne: session._id },
            });
            if (activeSession) {
                return res.status(400).json({
                    success: false,
                    message: `Đã có "${activeSession.name}" đang diễn ra`,
                });
            }

            await axios.post("http://localhost:8000/api/attendance/start", {
                classId: session.classId._id,
                cameraUrl: session.classId.cameraUrl,
            });

            session.status = "in_progress";
        }

        else if (status === "finished") {
            if (session.status !== "in_progress") {
                return res.status(400).json({
                    success: false,
                    message: "Chỉ có thể kết thúc khi phiên học đang diễn ra",
                });
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

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật trạng thái phiên học",
        });
    }
};

const deleteSession = async (req, res) => {
    const { sessionId } = req.params;
    const { id } = req.user;

    try {
        await runInTransaction(async (session) => {
            const sessionData = await Session.findById(sessionId).populate("classId").session(session);

            if (!sessionData) {
                throw new Error("Phiên học không tồn tại");
            }

            if (sessionData.classId.lecturerId.toString() !== id.toString()) {
                throw new Error("Bạn không có quyền xóa phiên học này");
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi xóa phiên học",
        });
    }
};

module.exports = {
    getDetailSession,
    createSession,
    updateSession,
    updateSessionStatus,
    deleteSession,
};
