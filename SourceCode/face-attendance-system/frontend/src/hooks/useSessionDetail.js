import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { message } from "antd";
import sessionApi from "../api/sessionApi.js";

const fetchSessionDetail = async (sessionId) => {
    const res =
        await sessionApi.getDetailSession(sessionId);

    return res.data.data;
};

const useSessionDetail = (sessionId, options = {}) => {
    const { enabled = true, ...rest } = options;

    const query = useQuery({
        queryKey: ["sessionDetail", sessionId],
        queryFn: () => fetchSessionDetail(sessionId),
        enabled,
        ...rest,
    });

    useEffect(() => {
        if (query.isError) {
            message?.error(
                query.error?.response?.data?.message ||
                "Lỗi khi lấy thông tin phiên học",
            );
        }
    }, [query.isError, query.error]);

    return {
        sessionDetail: query.data ?? null,
        loading: query.isLoading || query.isFetching,
        isError: query.isError,
        refetch: query.refetch,
        query,
    };
};

export default useSessionDetail;
