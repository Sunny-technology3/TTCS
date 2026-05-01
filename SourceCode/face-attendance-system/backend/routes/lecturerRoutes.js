const express = require("express");
const router = express.Router();
const { getLecturer } = require("../controllers/lecturerController");
const { verifyToken } = require("../middleware/verifyToken");

router.get("/info", verifyToken, getLecturer);

module.exports = router;
