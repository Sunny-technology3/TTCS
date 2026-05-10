import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { message } from "antd";
import attendanceApi from "../api/attendanceApi.js";

const fetchAttendanceBySession = async (classId, sessionId) => {
    const res =
        await attendanceApi.getAttendanceBySession(classId, sessionId);

    return res.data.data;
};

const useAttendanceBySession = (classId, sessionId, options = {}) => {
    const { enabled = true, ...rest } = options;

    const query = useQuery({
        queryKey: ["attendanceBySession", classId, sessionId],
        queryFn: () => fetchAttendanceBySession(classId, sessionId),
        enabled,
        ...rest,
    });

    useEffect(() => {
        if (query.isError) {
            message?.error(
                query.error?.response?.data?.message ||
                "Lỗi khi lấy danh sách điểm danh phiên học",
            );
        }
    }, [query.isError, query.error]);

    return {
        attendanceData: query.data || [],
        loading: query.isLoading || query.isFetching,
        isError: query.isError,
        refetch: query.refetch,
        query,
    };
};

export default useAttendanceBySession;
