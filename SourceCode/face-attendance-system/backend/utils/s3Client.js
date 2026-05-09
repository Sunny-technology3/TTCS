const { S3Client } = require("@aws-sdk/client-s3");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Khởi tạo S3Client (Cloudflare R2 tương thích S3)
const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: false,
});

module.exports = s3Client;
