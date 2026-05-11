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

    deleteSession: (sessionId) => {
        return axiosClient.delete(`/sessions/${sessionId}`);
    },

    importSessions: (formData) => {
        return axiosClient.post(
            "/sessions/import",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            }
        );
    },

    downloadSessionTemplate: () => {
        return axiosClient.get(
            "/sessions/template/download",
            {
                responseType: "blob",
            }
        );
    },
};

export default sessionApi;
