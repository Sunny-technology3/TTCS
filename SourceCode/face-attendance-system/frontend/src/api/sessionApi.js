import axiosClient from "./axiosClient";

const sessionApi = {
    getDetailSession: (sessionId) => {
        return axiosClient.get(`/sessions/${sessionId}`);
    },

    createSession: (data) => {
        return axiosClient.post("/sessions", data);
    },

    updateSession: (sessionId, data) => {
        return axiosClient.put(`/sessions/${sessionId}`, data);
    },

    updateStatusSession: (sessionId, status) => {
        return axiosClient.put(`/sessions/${sessionId}/status`, { status });
    },

    exportAttendanceSession: (sessionId) => {
        return axiosClient.get(`/sessions/${sessionId}/export-attendance`, {
            responseType: "blob",
        });
    },

    deleteSession: (sessionId) => {
        return axiosClient.delete(`/sessions/${sessionId}`);
    },
};

export default sessionApi;
