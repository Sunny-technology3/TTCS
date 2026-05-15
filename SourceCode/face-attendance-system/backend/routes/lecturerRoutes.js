const express = require("express");
const router = express.Router();
const {
    getLecturer,
    changePassword,
} = require("../controllers/lecturerController");

router.get("/info", getLecturer);

router.put("/change-password", changePassword);

module.exports = router;
