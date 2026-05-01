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
};

export default attendanceApi;
