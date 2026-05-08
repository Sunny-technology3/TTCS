const axios = require("axios");
const FormData = require("form-data");
const Student = require("../models/student");
const Class = require("../models/class");
const FaceEmbedding = require("../models/faceEmbedding");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");

const getEmbeddings = asyncHandler(async (req, res) => {
    const { classId } = req.query;

    const students = await Student.find({ classId });

    const studentIds = students.map(student => student._id);

    const embeddings = await FaceEmbedding.find({
        studentId: { $in: studentIds },
    });

    return res.status(200).json({
        success: true,
        data: embeddings,
    });
});

const createStudent = asyncHandler(async (req, res) => {
    const { studentId, fullName, classId } = req.body;
    const { id } = req.user;
    const file = req.file;

    const result = await runInTransaction(async (session) => {
        if (!studentId || !fullName) {
            throw new AppError(400, "Thiếu thông tin cần thiết");
        }

        const classData = await Class.findById(classId).session(session);
        if (!classData) {
            throw new AppError(404, "Không tìm thấy lớp học");
        }

        if (classData.lecturerId.toString() !== id.toString()) {
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

    return res.status(201).json({
        success: true,
        message: "Tạo sinh viên thành công",
        data: result,
    });
});

const updateStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { studentCode, fullName } = req.body;
    const { id } = req.user;

    const student = await Student.findById(studentId);

    if (!student) {
        throw new AppError(404, "Không tìm thấy sinh viên");
    }

    if (student.classId.lecturerId.toString() !== id.toString()) {
        throw new AppError(403, "Bạn không có quyền sửa thông tin sinh viên này");
    }

    student.studentId = studentCode ?? student.studentId;
    student.fullName = fullName ?? student.name;

    await student.save();

    return res.status(200).json({
        success: true,
        message: "Cập nhật thông tin sinh viên thành công",
        data: session,
    });
});

const deleteStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { id } = req.user;

    await runInTransaction(async (session) => {
        const student = await Student.findById(studentId).populate("classId").session(session);

        if (!student) {
            throw new AppError(404, "Sinh viên không tồn tại");
        }

        if (student.classId.lecturerId.toString() !== id.toString()) {
            throw new AppError(403, "Bạn không có quyền xóa sinh viên này");
        }

        await Student.findByIdAndDelete(studentId, { session });
        await FaceEmbedding.findOneAndDelete({ studentId }, { session });
        await Attendance.findOneAndDelete({ studentId }, { session });
    });

    return res.status(200).json({
        success: true,
        message: "Xóa sinh viên thành công",
    });
});

module.exports = {
    getEmbeddings,
    createStudent,
    updateStudent,
    deleteStudent,
};
