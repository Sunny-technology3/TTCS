const express = require("express");
const router = express.Router();
const {
    getEmbeddings,
    createStudent, updateStudent, deleteStudent
} = require("../controllers/studentController");
const multer = require("multer");
const upload = multer();

router.get("/embeddings", getEmbeddings);

router.post("/", upload.single("file"), createStudent);

router.put("/:id", upload.single("file"), updateStudent);

router.delete("/:studentId", deleteStudent);

module.exports = router;
