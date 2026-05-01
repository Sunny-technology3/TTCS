const Lecturer = require("../models/lecturer");

const getLecturer = async (req, res) => {
    const { id } = req.user;

    try {
        const lecturer = await Lecturer.findById(id);

        return res.status(200).json({
            success: true,
            message: "Lấy thông tin giảng viên thành công",
            data: lecturer,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi lấy thông tin giảng viên",
        });
    }
};

module.exports = { getLecturer };
