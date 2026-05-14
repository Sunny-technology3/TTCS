const asyncHandler = require("../utils/asyncHandler");
const { loginService } = require("../services/auth/authService");

const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    const token = await loginService({ username, password });

    return res.json({ token });
});

module.exports = { login };
