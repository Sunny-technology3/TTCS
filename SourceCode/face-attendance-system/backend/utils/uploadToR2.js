const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("./s3Client");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Hàm upload file
const uploadToR2 = async (file, folder, fileName) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${fileName}${fileExt}`;

    const params = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    // Gửi lệnh upload
    await s3Client.send(new PutObjectCommand(params));

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;

    return { key, url };
};

const getFileFromR2 = async (key) => {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    });

    return await s3Client.send(command);
};

module.exports = { uploadToR2, getFileFromR2 };
