import axiosClient from "./axiosClient";

const studentApi = {
    createStudent: (data) => {
        return axiosClient.post("/students", data);
    },

    updateStudent: (studentId, data) => {
        return axiosClient.put(`/students/${studentId}`, data);
    },

    deleteStudent: (studentId) => {
        return axiosClient.delete(`/students/${studentId}`);
    },

    importStudents: (data) => {
        return axiosClient.post(
            "/students/import",
            data,
            {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            }
        );
    },
};

export default studentApi;
