const jwt = require("jsonwebtoken");
const Lecturer = require("../models/lecturer");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const lecturer = await Lecturer.findOne({ username });

        if (!lecturer) {
            return res.status(404).send({ message: "Giảng viên không tồn tại" });
        }

        const isMatch = await bcrypt.compare(password, lecturer.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Sai mật khẩu"
            });
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi đăng nhập",
        });
    }
};

module.exports = { login };
