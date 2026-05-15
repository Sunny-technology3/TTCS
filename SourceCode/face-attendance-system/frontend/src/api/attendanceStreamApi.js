const AI_BASE_URL = "http://localhost:8000/api";

const attendanceStreamApi = {
    getVideoFeedUrl: ({
        classId,
        sessionId,
        cameraUrl
    }) => {
        const token = localStorage.getItem("token");

        return (
            `${AI_BASE_URL}/attendance/video-feed/${classId}` +
            `?sessionId=${sessionId}` +
            `&cameraUrl=${encodeURIComponent(cameraUrl)}` +
            `&token=${encodeURIComponent(token || "")}`
        );
    }
};

export default attendanceStreamApi;