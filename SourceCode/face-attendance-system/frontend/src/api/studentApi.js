import axiosClient from "./axiosClient";

const studentApi = {
    createStudent: (data) => {
        return axiosClient.post("/students", data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    updateStudent: (studentId, data) => {
        return axiosClient.put(`/students/${studentId}`, data, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },

    deleteStudent: (studentId) => {
        return axiosClient.delete(`/students/${studentId}`);
    },
};

export default studentApi;
