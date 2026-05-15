const express = require("express");
const router = express.Router();
const {
    getAllClass, getDetailClass,
    createClass, updateClass, deleteClass,
} = require("../controllers/classController");

router.get("/", getAllClass);

router.get("/:classId", getDetailClass);

router.post("/", createClass);

router.put("/:classId", updateClass);

router.delete("/:classId", deleteClass);

module.exports = router;
