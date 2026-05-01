const Class = require("../models/class");
const Student = require("../models/student");
const Session = require("../models/session");
const FaceEmbedding = require("../models/faceEmbedding");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");

const getAllClass = async (req, res) => {
    const { id } = req.user;

    try {
        const classes = await Class.find({ lecturerId: id }).lean();

        const result = await Promise.all(
            classes.map(async (cls) => {
                const studentCount = await Student.countDocuments({
                    classId: cls._id.toString(),
                });

                return {
                    ...cls,
                    studentCount,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách lớp học thành công",
            data: result,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy danh sách lớp học",
        });
    }
};

const getDetailClass = async (req, res) => {
    const { classId } = req.params;
    const { id } = req.user;

    try {
        const classData = await Class.findOne({
            _id: classId,
            lecturerId: id
        }).lean();

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học",
            });
        }

        const students = await Student.find({ classId }).lean();

        const sessions = await Session.find({ classId })
            .sort({ startTime: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Lấy thông tin lớp học thành công",
            data: {
                ...classData,
                students,
                studentCount: students.length,
                sessions,
                sessionCount: sessions.length,
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy thông tin lớp học",
        });
    }
};

const createClass = async (req, res) => {
    const { name, cameraUrl } = req.body;
    const { id } = req.user;

    try {
        if (!name || !cameraUrl) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin lớp học",
            });
        }

        const newClass = await Class.create({
            name,
            cameraUrl,
            lecturerId: id,
        });

        return res.status(201).json({
            success: true,
            message: "Tạo lớp học thành công",
            data: newClass,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi tạo lớp học",
        });
    }
};

const updateClass = async (req, res) => {
    const { classId } = req.params;
    const { name, cameraUrl } = req.body;
    const { id } = req.user;

    try {
        const cls = await Class.findById(classId);
        if (!cls) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy lớp học",
            });
        }

        if (cls.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền cập nhật lớp này",
            });
        }

        if (name) cls.name = name;
        if (cameraUrl) cls.cameraUrl = cameraUrl;

        await cls.save();

        return res.json({
            success: true,
            message: "Cập nhật thông tin lớp học thành công",
            data: cls,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật thông tin lớp học",
        });
    }
};

const deleteClass = async (req, res) => {
    const { classId } = req.params;
    const { id } = req.user;

    try {
        await runInTransaction(async (session) => {
            const deletedClass = await Class.findOneAndDelete(
                {
                    _id: classId,
                    lecturerId: id,
                },
                { session }
            );
            if (!deletedClass) {
                throw new Error("Lớp học không tồn tại");
            }

            const students = await Student.find(
                { classId: deletedClass._id },
            ).select("_id").session(session);

            const studentIds = students.map(s => s._id);

            await FaceEmbedding.deleteMany(
                { studentId: { $in: studentIds } },
                { session }
            );
            await Attendance.deleteMany(
                { sessionId: { $in: sessionIds } },
                { session }
            );
            await Student.deleteMany({ classId }, { session });
            await Session.deleteMany({ classId }, { session });
        });

        return res.status(200).json({
            success: true,
            message: "Xóa lớp học thành công",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi xóa lớp học",
        });
    }
};

module.exports = {
    getAllClass,
    getDetailClass,
    createClass,
    updateClass,
    deleteClass,
};
