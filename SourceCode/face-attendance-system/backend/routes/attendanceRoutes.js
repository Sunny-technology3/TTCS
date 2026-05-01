const express = require("express");
const router = express.Router();
const {
    autoCheckIn,
    getAttendanceBySession,
    updateAttendanceStatus,
    markAllPresent,
} = require("../controllers/attendanceController");
const { verifyToken } = require("../middleware/verifyToken");

router.post("/auto-checkin", autoCheckIn);

router.get("/session", verifyToken, getAttendanceBySession);

router.post("/mark-all", verifyToken, markAllPresent);

router.post("/:sessionId/:studentId", verifyToken, updateAttendanceStatus);

module.exports = router;
