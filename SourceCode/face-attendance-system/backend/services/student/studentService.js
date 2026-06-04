const axios = require("axios");
const XLSX = require("xlsx");
const AdmZip = require("adm-zip");
const path = require("path");
const FormData = require("form-data");
const Student = require("../../models/student");
const Class = require("../../models/class");
const FaceEmbedding = require("../../models/faceEmbedding");
const Attendance = require("../../models/attendance");
const { runInTransaction } = require("../../utils/runInTransaction");
const AppError = require("../../utils/appError");
const { uploadToR2 } = require("../../utils/uploadToR2");

const getEmbeddingService = async (classId) => {
    const students = await Student.find({ classId });

    const studentIds = students.map(student => student._id);

    const embeddings = await FaceEmbedding.find({
        studentId: { $in: studentIds },
    })
        .populate("studentId", "studentId")
        .lean();

    return embeddings.map(item => ({
        _id: item._id,
        embeddings: item.embeddings,
        studentId: item.studentId._id,
        studentCode: item.studentId.studentId,
    }));
};

const createStudentService = async ({ studentId, fullName, classId, lecturerId, file }) => {
    const result = await runInTransaction(async (session) => {
        if (!studentId || !fullName) {
            throw new AppError(400, "Thiếu thông tin cần thiết");
        }

        const classData = await Class.findById(classId).session(session);
        if (!classData) {
            throw new AppError(404, "Không tìm thấy lớp học");
        }

        if (classData.lecturerId.toString() !== lecturerId.toString()) {
            throw new AppError(403, "Bạn không có quyền tạo sinh viên trong lớp này");
        }

        const safeClassName = classData.name
            .normalize("NFD")                  // bỏ dấu
            .replace(/[\u0300-\u036f]/g, "")   // remove accents
            .replace(/\s+/g, "_")              // space → _
            .replace(/[^a-zA-Z0-9_]/g, "");    // chỉ giữ chữ, số, _

        const folder = `students/${safeClassName}/${studentId}`;
        const fileName = `avatar_${studentId}`;
        const { url } = await uploadToR2(file, folder, fileName);

        const newStudent = await Student.create(
            [
                {
                    studentId,
                    fullName,
                    classId,
                    avatarUrl: url,
                }
            ],
            { session },
        );

        if (file) {
            const formData = new FormData();
            formData.append("file", file.buffer, file.originalname);

            const aiRes = await axios.post(
                "http://localhost:8000/api/face/register",
                formData,
                { headers: formData.getHeaders() }
            );

            if (!aiRes.data.success) {
                throw new AppError(400, aiRes.data.message || "Lỗi máy chủ khi tạo embedding");
            }

            const embedding = aiRes.data.data.embedding;

            await FaceEmbedding.create(
                [
                    {
                        studentId: newStudent[0]._id,
                        embeddings: embedding,
                    }
                ],
                { session }
            );
        }

        return newStudent[0];
    });

    return result;
};

const updateStudentService = async ({
    studentId,
    studentCode,
    fullName,
    lecturerId,
    file,
    updateAvatar,
}) => {
    const student = await Student.findById(studentId).populate("classId");
    if (!student) {
        throw new AppError(404, "Không tìm thấy sinh viên");
    }

    if (student.classId.lecturerId.toString() !== lecturerId.toString()) {
        throw new AppError(403, "Bạn không có quyền sửa thông tin sinh viên này");
    }

    student.studentId = studentCode ?? student.studentId;
    student.fullName = fullName ?? student.fullName;

    if (updateAvatar && file) {
        const safeClassName = student.classId.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "");

        const folder = `students/${safeClassName}/${student.studentId}`;
        const fileName = `avatar_${student.studentId}`;

        const { url } = await uploadToR2(
            file,
            folder,
            fileName
        );

        student.avatarUrl = url;

        const formData = new FormData();

        formData.append(
            "file",
            file.buffer,
            file.originalname
        );

        const aiRes = await axios.post(
            "http://localhost:8000/api/face/register",
            formData,
            {
                headers: formData.getHeaders(),
            }
        );

        if (!aiRes.data.success) {
            throw new AppError(
                400,
                aiRes.data.message || "Lỗi tạo embedding"
            );
        }

        const embedding = aiRes.data.data.embedding;

        await FaceEmbedding.findOneAndUpdate(
            { studentId: student._id },
            { embeddings: embedding }
        );
    }

    await student.save();

    return student;
};

const deleteStudentService = async ({ studentId, lecturerId }) => {
    await runInTransaction(async (session) => {
        const student = await Student.findById(studentId).populate("classId").session(session);

        if (!student) {
            throw new AppError(404, "Sinh viên không tồn tại");
        }

        if (student.classId.lecturerId.toString() !== lecturerId.toString()) {
            throw new AppError(403, "Bạn không có quyền xóa sinh viên này");
        }

        await Student.findByIdAndDelete(studentId, { session });
        await FaceEmbedding.findOneAndDelete({ studentId }, { session });
        await Attendance.findOneAndDelete({ studentId }, { session });
    });
};

const importStudentsService = async ({
    classId,
    lecturerId,
    excelFile,
    zipFile,
}) => {
    if (!excelFile || !zipFile) {
        throw new AppError(400, "Thiếu file excel hoặc file ảnh");
    }

    const classData = await Class.findById(classId);
    if (!classData) {
        throw new AppError(404, "Không tìm thấy lớp học");
    }

    if (
        classData.lecturerId.toString()
        !== lecturerId.toString()
    ) {
        throw new AppError(403, "Bạn không có quyền");
    }

    // Đọc excel
    const workbook = XLSX.read(
        excelFile.buffer,
        { type: "buffer" }
    );

    const sheetName = workbook.SheetNames[0];

    const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        {
            range: 3,
            raw: false,
        }
    );

    // Đọc zip
    const zip = new AdmZip(zipFile.buffer);

    const zipEntries = zip.getEntries();

    const imageMap = {};

    for (const entry of zipEntries) {
        if (entry.isDirectory) {
            continue;
        }

        const fileName = path.basename(
            entry.entryName
        );

        const ext = path.extname(fileName);

        const studentId = path.basename(
            fileName,
            ext
        );

        imageMap[studentId] = {
            buffer: entry.getData(),
            originalname: fileName,
        };
    }

    const createdStudents = [];
    const failedStudents = [];

    const safeClassName = classData.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");

    for (const row of rows) {
        try {
            const studentId = row["Mã sinh viên"];
            const fullName = row["Họ và tên"];

            if (!studentId || !fullName) {
                failedStudents.push({
                    studentId,
                    fullName,
                    reason: "Thiếu dữ liệu",
                });

                continue;
            }

            const existed = await Student.findOne({
                studentId,
                classId,
            });
            if (existed) {
                failedStudents.push({
                    studentId,
                    fullName,
                    reason: "Sinh viên đã tồn tại",
                });

                continue;
            }

            const imageFile = imageMap[studentId];

            if (!imageFile) {
                failedStudents.push({
                    studentId,
                    fullName,
                    reason: "Không tìm thấy ảnh",
                });

                continue;
            }

            // Lưu trữ lên R2
            const folder = `students/${safeClassName}/${studentId}`;

            const fileName = `avatar_${studentId}`;

            const { url } = await uploadToR2(
                imageFile,
                folder,
                fileName
            );

            await runInTransaction(async (session) => {
                // Tạo sinh viên
                const student = await Student.create(
                    [
                        {
                            studentId,
                            fullName,
                            classId,
                            avatarUrl: url,
                        }
                    ],
                    { session }
                );

                // Gọi AI tạo embedding
                const formData = new FormData();

                formData.append(
                    "file",
                    imageFile.buffer,
                    imageFile.originalname
                );

                const aiRes = await axios.post(
                    "http://localhost:8000/api/face/register",
                    formData,
                    {
                        headers: formData.getHeaders(),
                    }
                );

                if (!aiRes.data.success) {
                    throw new Error(
                        "Không tạo được embedding"
                    );
                }

                // Lưu embedding
                await FaceEmbedding.create(
                    [
                        {
                            studentId: student[0]._id,
                            embeddings: aiRes.data.data.embedding,
                        }
                    ],
                    { session }
                );

                createdStudents.push(student[0]);
            });
        } catch (error) {
            failedStudents.push({
                studentId: row.studentId,
                fullName: row.fullName,
                reason: error.message,
            });
        }
    }

    return {
        successCount: createdStudents.length,
        failedCount: failedStudents.length,
        total: rows.length,
        students: createdStudents,
        failedStudents,
    };
};

module.exports = {
    getEmbeddingService,
    createStudentService,
    updateStudentService,
    deleteStudentService,
    importStudentsService,
};
