const AppError = require("../utils/appError.js");

const errorHandler = (error, req, res, next) => {
    console.log(error);

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    return res.status(500).json({
        success: false,
        message: "Lỗi máy chủ nội bộ",
    });
};

module.exports = errorHandler;
