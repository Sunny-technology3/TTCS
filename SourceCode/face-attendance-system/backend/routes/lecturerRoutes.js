const express = require("express");
const router = express.Router();
const {
    getLecturer,
    changePassword,
} = require("../controllers/lecturerController");
const { verifyToken } = require("../middleware/verifyToken");

router.get("/info", verifyToken, getLecturer);

router.put(
    "/change-password",
    verifyToken,
    changePassword
);

module.exports = router;
