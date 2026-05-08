const jwt = require("jsonwebtoken");
const Lecturer = require("../models/lecturer");
const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/appError");
require("dotenv").config();

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const lecturer = await Lecturer.findOne({ username });

    if (!lecturer) {
        throw new AppError(404, "Giảng viên không tồn tại");
    }

    const isMatch = await bcrypt.compare(password, lecturer.password);

    if (!isMatch) {
        throw new AppError(400, "Sai mật khẩu");
    }

    jwt.sign(
        { id: lecturer._id, username: lecturer.username },
        process.env.secretKey,
        { expiresIn: "1h" },
        (error, token) => {
            if (error) {
                res.status(500).json({
                    success: false,
                    message: "Lỗi máy chủ khi tạo token",
                });
            } else {
                res.json({ token });
            }
        }
    );
});

module.exports = { login };
