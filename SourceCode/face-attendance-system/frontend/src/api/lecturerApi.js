import axiosClient from "./axiosClient";

const lecturerApi = {
    getLecturer: () => {
        return axiosClient.get("/lecturers/info");
    },
};

export default lecturerApi;
