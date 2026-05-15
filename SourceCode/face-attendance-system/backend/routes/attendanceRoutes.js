const express = require("express");
const router = express.Router();
const {
    autoCheckIn,
    getAttendanceBySession,
    updateAttendanceStatus,
    markAllPresent,
    exportAttendanceBySession,
    exportAttendanceByClass,
} = require("../controllers/attendanceController");

router.post("/auto-check-in", autoCheckIn);

router.get("/session", getAttendanceBySession);

router.post("/mark-all", markAllPresent);

router.post("/:sessionId/:studentId", updateAttendanceStatus);

router.get("/export/session/:sessionId", exportAttendanceBySession);

router.get("/export/class/:classId", exportAttendanceByClass);

module.exports = router;
