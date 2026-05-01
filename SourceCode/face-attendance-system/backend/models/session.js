const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
    },
    startTime: {
        type: Date,
    },
    endTime: {
        type: Date,
    },
    status: {
        type: String,
        enum: ["not_started", "in_progress", "finished"],
        default: "not_started",
    },
}, { timestamps: true });

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
