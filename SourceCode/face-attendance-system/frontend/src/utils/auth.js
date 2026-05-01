import { jwtDecode } from "jwt-decode";

export const getToken = () => localStorage.getItem("token");

export const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        return decoded.exp < currentTime;
    } catch {
        return true;
    }
};