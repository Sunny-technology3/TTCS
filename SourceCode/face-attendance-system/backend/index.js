const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors());

app.use(express.json());

const mongoose = require("mongoose");
require("dotenv").config();

const LoginRoutes = require("./routes/loginRoutes");
app.use("/api/login", LoginRoutes);

const LecturerRoutes = require("./routes/lecturerRoutes");
app.use("/api/lecturers", LecturerRoutes);

const ClassRoutes = require("./routes/classRoutes");
app.use("/api/classes", ClassRoutes);

const SessionRoutes = require("./routes/sessionRoutes");
app.use("/api/sessions", SessionRoutes);

const StudentRoutes = require("./routes/studentRoutes");
app.use("/api/students", StudentRoutes);

const AttendanceRoutes = require("./routes/attendanceRoutes");
app.use("/api/attendances", AttendanceRoutes);

mongoose.connect(process.env.DB_URL)
    .then(() => {
        console.log("Successfully connected to MongoDB Atlas!");

        app.listen(8080, () => {
            console.log("Server listening on port 8080");
        });
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });
