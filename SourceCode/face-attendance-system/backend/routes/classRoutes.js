const express = require("express");
const router = express.Router();
const {
    getAllClass, getDetailClass,
    createClass, updateClass, deleteClass,
} = require("../controllers/classController");
const { verifyToken } = require("../middleware/verifyToken");

router.get("/", verifyToken, getAllClass);

router.get("/:classId", verifyToken, getDetailClass);

router.post("/", verifyToken, createClass);

router.put("/:classId", verifyToken, updateClass);

router.delete("/:classId", verifyToken, deleteClass);

module.exports = router;
