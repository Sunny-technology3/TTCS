const Class = require("../../models/class");
const Student = require("../../models/student");
const Session = require("../../models/session");
const FaceEmbedding = require("../../models/faceEmbedding");
const Attendance = require("../../models/attendance");
const { runInTransaction } = require("../../utils/runInTransaction");
const AppError = require("../../utils/appError");

const getAllClassService = async ({ lecturerId, search }) => {
    const query = {
        lecturerId,
    };

    if (search) {
        query.name = {
            $regex: search,
            $options: "i",
        };
    }

    const classes = await Class.find(query).lean();

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

    return result;
};

const getDetailClassService = async ({ classId, lecturerId }) => {
    const classData = await Class.findOne({
        _id: classId,
        lecturerId
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

    return {
        ...classData,
        students: studentsWithStats,
        studentCount: students.length,
        sessions,
        sessionCount: sessions.length,
    };
};

const createClassService = async ({ name, cameraUrl, lecturerId }) => {
    if (!name || !cameraUrl) {
        throw new AppError(400, "Thiếu thông tin lớp học");
    }

    const newClass = await Class.create({
        name,
        cameraUrl,
        lecturerId,
    });

    return newClass;
};

const updateClassService = async ({ classId, name, cameraUrl, lecturerId }) => {
    const cls = await Class.findById(classId);
    if (!cls) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (cls.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền cập nhật lớp này");
    }

    if (name) cls.name = name;
    if (cameraUrl) cls.cameraUrl = cameraUrl;

    await cls.save();

    return cls;
};

const deleteClassService = async ({ classId, lecturerId }) => {
    await runInTransaction(async (session) => {
        const deletedClass = await Class.findOneAndDelete(
            {
                _id: classId,
                lecturerId,
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

        const sessions = await Session.find({ classId: deletedClass._id })
            .select("_id")
            .session(session);
        const sessionIds = sessions.map(s => s._id);

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
};

module.exports = {
    getAllClassService,
    getDetailClassService,
    createClassService,
    updateClassService,
    deleteClassService,
};
