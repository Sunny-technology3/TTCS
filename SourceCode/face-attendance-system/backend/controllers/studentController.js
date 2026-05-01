const axios = require("axios");
const FormData = require("form-data");
const Student = require("../models/student");
const Class = require("../models/class");
const FaceEmbedding = require("../models/faceEmbedding");
const Attendance = require("../models/attendance");
const { runInTransaction } = require("../utils/runInTransaction");

const getEmbeddings = async (req, res) => {
    const { classId } = req.query;

    try {
        const students = await Student.find({ classId });

        const studentIds = students.map(student => student._id);

        const embeddings = await FaceEmbedding.find({
            studentId: { $in: studentIds },
        });

        return res.status(200).json({
            success: true,
            data: embeddings,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy embedding của sinh viên",
        });
    }
};

const createStudent = async (req, res) => {
    const { studentId, fullName, classId } = req.body;
    const { id } = req.user;
    const file = req.file;

    try {
        const result = await runInTransaction(async (session) => {
            if (!studentId || !fullName) {
                return res.status(400).json({
                    success: false,
                    message: "Thiếu thông tin cần thiết",
                });
            }

            const classData = await Class.findById(classId).session(session);
            if (!classData) {
                throw new Error("Không tìm thấy lớp học");
            }

            if (classData.lecturerId.toString() !== id.toString()) {
                throw new Error("Bạn không có quyền tạo sinh viên trong lớp này");
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi thêm sinh viên",
        });
    }
};

const updateStudent = async (req, res) => {
    const { studentId } = req.params;
    const { studentCode, fullName } = req.body;
    const { id } = req.user;

    try {
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sinh viên",
            });
        }

        if (student.classId.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền sửa thông tin sinh viên này",
            });
        }

        student.studentId = studentCode ?? student.studentId;
        student.fullName = fullName ?? student.name;

        await student.save();

        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin sinh viên thành công",
            data: session,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật thông tin sinh viên",
        });
    }
};

const deleteStudent = async (req, res) => {
    const { studentId } = req.params;
    const { id } = req.user;

    try {
        await runInTransaction(async (session) => {
            const student = await Student.findById(studentId).populate("classId").session(session);

            if (!student) {
                throw new Error("Sinh viên không tồn tại");
            }

            if (student.classId.lecturerId.toString() !== id.toString()) {
                throw new Error("Bạn không có quyền xóa sinh viên này");
            }

            await Student.findByIdAndDelete(studentId, { session });
            await FaceEmbedding.findOneAndDelete({ studentId }, { session });
            await Attendance.findOneAndDelete({ studentId }, { session });
        });

        return res.status(200).json({
            success: true,
            message: "Xóa sinh viên thành công",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi xóa sinh viên",
        });
    }
};

module.exports = {
    getEmbeddings,
    createStudent,
    updateStudent,
    deleteStudent,
};
