import axiosClient from "./axiosClient";

const attendanceApi = {
    getAttendanceBySession: (classId, sessionId) => {
        return axiosClient.get("/attendances/session", {
            params: {
                classId,
                sessionId,
            }
        });
    },

    updateAttendanceStatus: (sessionId, studentId, status) => {
        return axiosClient.post(`/attendances/${sessionId}/${studentId}`, { status });
    },

    markAllPresent: (data) => {
        return axiosClient.post("/attendances/mark-all", data);
    },

    exportAttendanceBySession: (sessionId) => {
        return axiosClient.get(`/attendances/export/session/${sessionId}`, {
            responseType: "blob",
        });
    },

    exportAttendanceByClass: (classId) => {
        return axiosClient.get(`/attendances/export/class/${classId}`, {
            responseType: "blob",
        });
    },
};

export default attendanceApi;
