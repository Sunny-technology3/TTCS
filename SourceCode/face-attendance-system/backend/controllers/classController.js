const Class = require("../models/class");
const Student = require("../models/student");
const Session = require("../models/session");
const FaceEmbedding = require("../models/faceEmbedding");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const getAllClass = asyncHandler(async (req, res) => {
    const { id } = req.user;

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
});

const getDetailClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { id } = req.user;

    const classData = await Class.findOne({
        _id: classId,
        lecturerId: id
    }).lean();

    if (!classData) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    const students = await Student.find({ classId }).lean();

    const sessions = await Session.find({ classId })
        .sort({ startTime: 1 })
        .lean();

    const attendances = await Attendance.find({
        sessionId: { $in: sessions.map(s => s._id) }
    }).lean();

    const attendanceMap = new Map(
        attendances.map(a => [
            `${a.studentId}_${a.sessionId}`,
            a
        ])
    );

    const studentsWithStats = students.map(student => {
        let present = 0;
        let late = 0;
        let absent = 0;

        sessions.forEach(session => {
            const att = attendanceMap.get(
                `${student._id}_${session._id}`
            );

            const status = att?.status || "absent";

            if (status === "present") present++;
            else if (status === "late") late++;
            else absent++;
        });

        return {
            ...student,
            stats: {
                present,
                late,
                absent
            }
        };
    });

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin lớp học thành công",
        data: {
            ...classData,
            students: studentsWithStats,
            studentCount: students.length,
            sessions,
            sessionCount: sessions.length,
        },
    });
});

const createClass = asyncHandler(async (req, res) => {
    const { name, cameraUrl } = req.body;
    const { id } = req.user;

    if (!name || !cameraUrl) {
        throw new AppError(400, "Thiếu thông tin lớp học");
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
});

const updateClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { name, cameraUrl } = req.body;
    const { id } = req.user;

    const cls = await Class.findById(classId);
    if (!cls) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (cls.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền cập nhật lớp này");
    }

    if (name) cls.name = name;
    if (cameraUrl) cls.cameraUrl = cameraUrl;

    await cls.save();

    return res.json({
        success: true,
        message: "Cập nhật thông tin lớp học thành công",
        data: cls,
    });
});

const deleteClass = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { id } = req.user;

    await runInTransaction(async (session) => {
        const deletedClass = await Class.findOneAndDelete(
            {
                _id: classId,
                lecturerId: id,
            },
            { session }
        );
        if (!deletedClass) {
            throw new AppError(404, "Lớp học không tồn tại");
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
});

module.exports = {
    getAllClass,
    getDetailClass,
    createClass,
    updateClass,
    deleteClass,
};
