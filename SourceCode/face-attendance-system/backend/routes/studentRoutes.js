const express = require("express");
const router = express.Router();
const {
    getEmbeddings,
    createStudent, updateStudent, deleteStudent,
    importStudents,
} = require("../controllers/studentController");
const multer = require("multer");
const upload = multer();

router.get("/embeddings", getEmbeddings);

router.post("/", upload.single("file"), createStudent);

router.put("/:id", upload.single("file"), updateStudent);

router.delete("/:studentId", deleteStudent);

router.post(
    "/import",
    upload.fields([
        {
            name: "excel",
            maxCount: 1,
        },
        {
            name: "images",
            maxCount: 1,
        },
    ]),
    importStudents
);

module.exports = router;
