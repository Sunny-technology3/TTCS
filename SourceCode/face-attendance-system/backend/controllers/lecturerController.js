const {
    getLecturerService,
    changePasswordService,
} = require("../services/lecturer/lecturerService");
const asyncHandler = require("../utils/asyncHandler");

const getLecturer = asyncHandler(async (req, res) => {
    const lecturer = await getLecturerService(req.user.id);

    return res.status(200).json({
        success: true,
        message: "Lấy thông tin giảng viên thành công",
        data: lecturer,
    });
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.user;

    await changePasswordService({
        lecturerId: id,
        currentPassword,
        newPassword,
    });

    return res.status(200).json({
        success: true,
        message: "Đổi mật khẩu thành công",
    });
});

module.exports = {
    getLecturer,
    changePassword,
};
