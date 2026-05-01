const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    lecturerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lecturer",
        required: true,
    },
    cameraUrl: {
        type: String,
        default: null,
    },
}, { timestamps: true });

const Class = mongoose.model("Class", classSchema);

module.exports = Class;
