const bcrypt = require("bcryptjs");
const Lecturer = require("../../models/lecturer");
const AppError = require("../../utils/appError");

const getLecturerService = async (lecturerId) => {
    const lecturer = await Lecturer.findById(lecturerId);

    return lecturer;
};

const changePasswordService = async ({
    lecturerId,
    currentPassword,
    newPassword,
}) => {
    currentPassword = currentPassword?.trim();
    newPassword = newPassword?.trim();

    if (!currentPassword || !newPassword) {
        throw new AppError(400, "Thiếu thông tin");
    }

    if (newPassword.length < 8) {
        throw new AppError(
            400,
            "Mật khẩu phải có ít nhất 8 ký tự"
        );
    }

    if (currentPassword === newPassword) {
        throw new AppError(
            400,
            "Mật khẩu mới không được trùng mật khẩu cũ"
        );
    }

    const lecturer = await Lecturer.findById(lecturerId);
    if (!lecturer) {
        throw new AppError(404, "Không tìm thấy giảng viên");
    }

    const isMatch = await bcrypt.compare(
        currentPassword,
        lecturer.password
    );
    if (!isMatch) {
        throw new AppError(400, "Mật khẩu hiện tại không đúng");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    lecturer.password = hashedPassword;

    await lecturer.save();

    return true;
};


module.exports = {
    getLecturerService,
    changePasswordService,
};
