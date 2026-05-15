const express = require("express");
const router = express.Router();
const {
    getDetailSession,
    createSession, updateSession, updateSessionStatus, deleteSession,
    importSessions, downloadSessionTemplate,
} = require("../controllers/sessionController");
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(),
});

router.get("/:sessionId", getDetailSession);

router.post("/", createSession);

router.put("/:sessionId", updateSession);

router.put("/:sessionId/status", updateSessionStatus);

router.delete("/:sessionId", deleteSession);

router.post(
    "/import",
    upload.single("file"),
    importSessions
);

router.get("/template/download", downloadSessionTemplate);

module.exports = router;
