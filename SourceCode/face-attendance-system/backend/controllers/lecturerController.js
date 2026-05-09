const { getLecturerService } = require("../services/lecturer/lecturerService");
const asyncHandler = require("../utils/asyncHandler");

const getLecturer = asyncHandler(async (req, res) => {
    const lecturer = await getLecturerService(req.user.id);

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin giảng viên thành công",
        data: lecturer,
    });
});

module.exports = { getLecturer };
