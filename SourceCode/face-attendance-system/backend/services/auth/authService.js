const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Lecturer = require("../../models/lecturer");
const AppError = require("../../utils/appError");
require("dotenv").config();

const loginService = async ({ username, password }) => {
    const lecturer = await Lecturer.findOne({ username });

    if (!lecturer) {
        throw new AppError(400, "Tài khoản hoặc mật khẩu không chính xác");
    }

    const isMatch = await bcrypt.compare(password, lecturer.password);

    if (!isMatch) {
        throw new AppError(400, "Tài khoản hoặc mật khẩu không chính xác");
    }

    const token = jwt.sign(
        { id: lecturer._id, username: lecturer.username },
        process.env.secretKey,
        { expiresIn: "1h" }
    );

    return token;
};

module.exports = { loginService };