const asyncHandler = require("../utils/asyncHandler");
const {
    getAllClassService,
    getDetailClassService,
    createClassService,
    updateClassService,
    deleteClassService,
} = require("../services/class/classService");

const getAllClass = asyncHandler(async (req, res) => {
    const result = await getAllClassService(req.user.id);

    return res.status(200).json({
        success: true,
        message: "Lấy danh sách lớp học thành công",
        data: result,
    });
});

const getDetailClass = asyncHandler(async (req, res) => {
    const data = await getDetailClassService({
        classId: req.params.classId,
        lecturerId: req.user.id,
    });

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin lớp học thành công",
        data,
    });
});

const createClass = asyncHandler(async (req, res) => {
    const { name, cameraUrl } = req.body;

    const newClass = await createClassService({
        name,
        cameraUrl,
        lecturerId: req.user.id,
    });

    return res.status(201).json({
        success: true,
        message: "Tạo lớp học thành công",
        data: newClass,
    });
});

const updateClass = asyncHandler(async (req, res) => {
    const { name, cameraUrl } = req.body;

    const cls = await updateClassService({
        classId: req.params.classId,
        name,
        cameraUrl,
        lecturerId: req.user.id,
    });

    return res.json({
        success: true,
        message: "Cập nhật thông tin lớp học thành công",
        data: cls,
    });
});

const deleteClass = asyncHandler(async (req, res) => {
    await deleteClassService({
        classId: req.params.classId,
        lecturerId: req.user.id,
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
