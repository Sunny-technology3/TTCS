import axiosClient from "./axiosClient";

const loginApi = {
    login: (data) => {
        return axiosClient.post("/login", data);
    },
};

export default loginApi;
