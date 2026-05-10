import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import classApi from "../api/classApi.js";
import { message } from "antd";

const fetchClassDetail = async (classId) => {
    const res =
        await classApi.getDetailClass(classId);

    return res.data.data;
};

const useClassDetail = (classId, options = {}) => {
    const { enabled = true, ...rest } = options;

    const query = useQuery({
        queryKey: ["classDetail", classId],
        queryFn: () => fetchClassDetail(classId),
        enabled,
        ...rest,
    });

    useEffect(() => {
        if (query.isError) {
            message?.error(
                query.error?.response?.data?.message ||
                "Lỗi khi lấy thông tin lớp học",
            );
        }
    }, [query.isError, query.error]);

    return {
        classDetail: query.data ?? null,
        loading: query.isLoading || query.isFetching,
        isError: query.isError,
        refetch: query.refetch,
        query,
    };
};

export default useClassDetail;
