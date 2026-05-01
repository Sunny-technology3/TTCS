const express = require("express");
const router = express.Router();
const {
    getEmbeddings,
    createStudent, updateStudent, deleteStudent
} = require("../controllers/studentController");
const { verifyToken } = require("../middleware/verifyToken");
const multer = require("multer");
const upload = multer();

router.get("/embeddings", getEmbeddings);

router.post("/", verifyToken, upload.single("file"), createStudent);

router.put("/:studentId", verifyToken, updateStudent);

router.delete("/:studentId", verifyToken, deleteStudent);

module.exports = router;
