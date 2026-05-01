const mongoose = require("mongoose");

const lecturerSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "lecturer"
    },
}, { timestamps: true });

const Lecturer = mongoose.model("Lecturer", lecturerSchema);

module.exports = Lecturer;
