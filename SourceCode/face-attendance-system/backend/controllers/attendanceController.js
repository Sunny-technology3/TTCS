const axios = require("axios");
const Attendance = require("../models/attendance");
const Session = require("../models/session");
const FaceEmbedding = require("../models/faceEmbedding");
const Class = require("../models/class");
const Student = require("../models/student");
const { getSessionAttendanceData } = require("../services/sessionAttendanceService");

const autoCheckIn = async (req, res) => {
    const { classId } = req.query;
    const { studentId } = req.body;

    try {
        const classData = await Class.findById(classId);
        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Lớp học không tồn tại",
            });
        }

        const session = await Session.findOne({
            classId,
            status: "in_progress",
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Không có buổi học đang diễn ra",
            });
        }

        let attendance = await Attendance.findOne({
            studentId,
            sessionId: session._id,
        });

        if (attendance && attendance.checkIn) {
            return res.json({
                success: true,
                message: "Đã điểm danh",
            });
        }

        const now = new Date();
        const lateThreshold = 10 * 60 * 1000;

        let status = "present";

        if (now - session.startTime > lateThreshold) {
            status = "late";
        }

        if (!attendance) {
            attendance = await Attendance.create({
                studentId,
                sessionId: session._id,
                checkIn: now,
                status,
            });
        }

        return res.json({
            success: true,
            data: attendance,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const getAttendanceBySession = async (req, res) => {
    const { classId, sessionId } = req.query;
    const { id } = req.user;

    try {
        const attendanceData = await getSessionAttendanceData({
            sessionId,
            lecturerId: id,
            classId,
        });

        return res.status(200).json({
            success: true,
            data: attendanceData.rows.map((row) => ({
                _id: row._id,
                fullName: row.fullName,
                studentId: row.studentId,
                checkIn: row.checkIn,
                status: row.status,
            })),
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách điểm danh",
        });
    }
};

const updateAttendanceStatus = async (req, res) => {
    const { studentId, sessionId } = req.params;
    const { status } = req.body;
    const { id } = req.user;

    try {
        const session = await Session.findById(sessionId).populate("classId");
        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy phiên học",
            });
        }

        if (session.classId.lecturerId.toString() !== id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền cập nhật trạng thái phiên học này",
            });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sinh viên",
            });
        }

        const attendance = await Attendance.findOne({ sessionId, studentId });
        if (attendance) {
            return res.status(400).json({
                success: false,
                message: "Sinh viên đã điểm danh rồi",
            });
        }

        const result = await Attendance.create({
            studentId,
            sessionId,
            checkIn: new Date(),
            status,
        });

        return res.status(201).json({
            success: true,
            message: "Cập nhật trạng thái điểm danh của sinh viên thành công",
            data: {
                _id: student._id,
                fullName: student.fullName,
                studentId: student.studentId,
                checkIn: result.checkIn,
                status: result.status,
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi cập nhật trạng thái điểm danh của sinh viên",
        });
    }
};

const markAllPresent = async (req, res) => {
    const { classId, sessionId } = req.body;

    try {
        const students = await Student.find({ classId });

        // const bulkOps = students.map(student => ({
        //     updateOne: {
        //         filter: {
        //             studentId: student._id,
        //             sessionId
        //         },
        //         update: {
        //             studentId: student._id,
        //             sessionId,
        //             checkIn: new Date(),
        //             status: "present"
        //         },
        //         upsert: true
        //     }
        // }));

        const bulkOps = [];

        for (const student of students) {
            const attendance = await Attendance.findOne({
                studentId: student._id,
                sessionId
            });

            if (!attendance) {
                bulkOps.push({
                    insertOne: {
                        document: {
                            studentId: student._id,
                            sessionId,
                            checkIn: new Date(),
                            status: "present"
                        }
                    }
                });
            }
        }

        if (bulkOps.length > 0) {
            await Attendance.bulkWrite(bulkOps);
        }

        return res.json({
            success: true,
            message: "Điểm danh tất cả thành công"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Lỗi máy chủ khi điểm danh tất cả"
        });
    }
};

module.exports = {
    autoCheckIn,
    getAttendanceBySession,
    updateAttendanceStatus,
    markAllPresent,
};
