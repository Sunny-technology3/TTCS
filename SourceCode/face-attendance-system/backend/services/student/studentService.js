const axios = require("axios");
const FormData = require("form-data");
const Student = require("../../models/student");
const Class = require("../../models/class");
const FaceEmbedding = require("../../models/faceEmbedding");
const Attendance = require("../../models/attendance");
const { runInTransaction } = require("../../utils/runInTransaction");
const AppError = require("../../utils/appError");

const getEmbeddingService = async (classId) => {
    const students = await Student.find({ classId });

    const studentIds = students.map(student => student._id);

    const embeddings = await FaceEmbedding.find({
        studentId: { $in: studentIds },
    });

    return embeddings;
};

const createStudentService = async ({ studentId, fullName, classId, lecturerId, file }) => {
    const result = await runInTransaction(async (session) => {
        if (!studentId || !fullName) {
            throw new AppError(400, "Thiếu thông tin cần thiết");
        }

        const classData = await Class.findById(classId).session(session);
        if (!classData) {
            throw new AppError(404, "Không tìm thấy lớp học");
        }

        if (classData.lecturerId.toString() !== lecturerId.toString()) {
            throw new AppError(403, "Bạn không có quyền tạo sinh viên trong lớp này");
        }

        const newStudent = await Student.create(
            [
                {
                    studentId,
                    fullName,
                    classId,
                }
            ],
            { session },
        );

        if (file) {
            const formData = new FormData();
            formData.append("file", file.buffer, file.originalname);

            const aiRes = await axios.post(
                "http://localhost:8000/api/face/register",
                formData,
                { headers: formData.getHeaders() }
            );

            if (!aiRes.data.success) {
                throw new AppError(400, aiRes.data.message || "Lỗi máy chủ khi tạo embedding");
            }

            const embedding = aiRes.data.data.embedding;

            await FaceEmbedding.create(
                [
                    {
                        studentId: newStudent[0]._id,
                        embedding,
                    }
                ],
                { session }
            );
        }

        return newStudent[0];
    });

    return result;
};

const updateStudentService = async ({ studentId, studentCode, fullName, lecturerId }) => {
    const student = await Student.findById(studentId).populate("classId");
    if (!student) {
        throw new AppError(404, "Không tìm thấy sinh viên");
    }

    if (student.classId.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền sửa thông tin sinh viên này");
    }

    student.studentId = studentCode ?? student.studentId;
    student.fullName = fullName ?? student.name;

    await student.save();

    return student;
};

const deleteStudentService = async ({ studentId, lecturerId }) => {
    await runInTransaction(async (session) => {
        const student = await Student.findById(studentId).populate("classId").session(session);

        if (!student) {
            throw new AppError(404, "Sinh viên không tồn tại");
        }

        if (student.classId.lecturerId.toString() !== lecturerId.toString()) {
            throw new AppError(403, "Bạn không có quyền xóa sinh viên này");
        }

        await Student.findByIdAndDelete(studentId, { session });
        await FaceEmbedding.findOneAndDelete({ studentId }, { session });
        await Attendance.findOneAndDelete({ studentId }, { session });
    });
};

module.exports = {
    getEmbeddingService,
    createStudentService,
    updateStudentService,
    deleteStudentService,
};
