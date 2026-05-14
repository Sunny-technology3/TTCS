import axiosClient from "./axiosClient";

const lecturerApi = {
    getLecturer: () => {
        return axiosClient.get("/lecturers/info");
    },

    changePassword: (data) => {
        return axiosClient.put(
            "/lecturers/change-password",
            data
        );
    },
};

export default lecturerApi;
