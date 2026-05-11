const express = require("express");
const router = express.Router();
const {
    getDetailSession,
    createSession, updateSession, updateSessionStatus, deleteSession,
    importSessions, downloadSessionTemplate,
} = require("../controllers/sessionController");
const { verifyToken } = require("../middleware/verifyToken");
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
});

router.get("/:sessionId", verifyToken, getDetailSession);

router.post("/", verifyToken, createSession);

router.put("/:sessionId", verifyToken, updateSession);

router.put("/:sessionId/status", verifyToken, updateSessionStatus);

router.delete("/:sessionId", verifyToken, deleteSession);

router.post(
    "/import",
    verifyToken,
    upload.single("file"),
    importSessions
);

router.get(
    "/template/download",
    verifyToken,
    downloadSessionTemplate
);

module.exports = router;
