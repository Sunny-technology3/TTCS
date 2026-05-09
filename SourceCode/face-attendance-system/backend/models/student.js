const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        trim: true,
        required: true,
    },
    fullName: {
        type: String,
        trim: true,
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true,
    },
    avatarUrl: {
        type: String,
        trim: true,
        required: true,
    },
}, { timestamps: true });

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
