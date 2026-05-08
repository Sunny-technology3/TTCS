const Lecturer = require("../models/lecturer");
const asyncHandler = require("../utils/asyncHandler");

const getLecturer = asyncHandler(async (req, res) => {
    const { id } = req.user;

    const lecturer = await Lecturer.findById(id);

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin giảng viên thành công",
        data: lecturer,
    });
});

module.exports = { getLecturer };
