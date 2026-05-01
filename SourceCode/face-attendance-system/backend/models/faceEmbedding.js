const mongoose = require("mongoose");

const faceEmbeddingSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
}, { timestamps: true });

const FaceEmbedding = mongoose.model("FaceEmbedding", faceEmbeddingSchema, "face_embeddings");

module.exports = FaceEmbedding;
