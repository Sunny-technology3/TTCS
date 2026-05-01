import axiosClient from "./axiosClient";

const classApi = {
    getAllClass: () => {
        return axiosClient.get("/classes");
    },

    getDetailClass: (classId) => {
        return axiosClient.get(`/classes/${classId}`);
    },

    createClass: (data) => {
        return axiosClient.post("/classes", data);
    },

    updateClass: (classId, data) => {
        return axiosClient.put(`/classes/${classId}`, data);
    },

    deleteClass: (classId) => {
        return axiosClient.delete(`/classes/${classId}`);
    },
};

export default classApi;
