const express = require("express");
const router = express.Router();
const {
    getDetailSession,
    createSession, updateSession, updateSessionStatus, deleteSession,
} = require("../controllers/sessionController");
const { verifyToken } = require("../middleware/verifyToken");

router.get("/:sessionId", verifyToken, getDetailSession);

router.post("/", verifyToken, createSession);

router.put("/:sessionId", verifyToken, updateSession);

router.put("/:sessionId/status", verifyToken, updateSessionStatus);

router.delete("/:sessionId", verifyToken, deleteSession);

module.exports = router;
