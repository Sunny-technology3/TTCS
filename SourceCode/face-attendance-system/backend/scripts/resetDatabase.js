const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});

const Lecturer = require("../models/lecturer"); 

async function resetDatabase() {
    try {
        await mongoose.connect(process.env.DB_URL);
        console.log("Connected to MongoDB");

        // Xóa toàn bộ collection
        const collections = await mongoose.connection.db.collections();

        for (const collection of collections) {
            await collection.deleteMany({});
            console.log(`Cleared ${collection.collectionName}`);
        }

        // Tạo giảng viên mặc định
        const hashedPassword = await bcrypt.hash("12345678", 10);

        await Lecturer.create({
            username: "GV001",
            fullName: "Nguyễn Văn A",
            email: "gv001@example.com",
            password: hashedPassword,
            role: "lecturer",
        });

        console.log("Created lecturer GV001");
        console.log("Username: GV001");
        console.log("Password: 12345678");

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

resetDatabase();