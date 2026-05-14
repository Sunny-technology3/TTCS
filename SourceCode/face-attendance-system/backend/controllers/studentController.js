const asyncHandler = require("../utils/asyncHandler");
const {
    getEmbeddingService,
    createStudentService, updateStudentService, deleteStudentService,
} = require("../services/student/studentService");

const getEmbeddings = asyncHandler(async (req, res) => {
    const embeddings = await getEmbeddingService(req.query.classId);

    return res.status(200).json({
        success: true,
        data: embeddings,
    });
});

const createStudent = asyncHandler(async (req, res) => {
    const { studentId, fullName, classId } = req.body;
    const { id } = req.user;
    const file = req.file;

    const result = await createStudentService({ studentId, fullName, classId, lecturerId: id, file });

    return res.status(201).json({
        success: true,
        message: "Tạo sinh viên thành công",
        data: result,
    });
});

const updateStudent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { studentId, fullName, updateAvatar } = req.body;
    const { id: lecturerId } = req.user;

    const student = await updateStudentService({
        studentId: id,
        studentCode: studentId,
        fullName,
        lecturerId,
        updateAvatar:
            updateAvatar === "true",
        file: req.file,
    });

    return res.status(200).json({
        success: true,
        message: "Cập nhật thông tin sinh viên thành công",
        data: student,
    });
});

const deleteStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { id } = req.user;

    await deleteStudentService({ studentId, lecturerId: id });

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
