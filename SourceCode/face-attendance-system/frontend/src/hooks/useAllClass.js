import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import classApi from "../api/classApi.js";
import { message } from "antd";

const fetchClasses = async (search) => {
    const res =
        await classApi.getAllClass(search);

    return res.data.data;
};

const useAllClass = (search, options = {}) => {
    const { enabled = true, ...rest } = options;

    const query = useQuery({
        queryKey: ["allClass", search],
        queryFn: () => fetchClasses(search),
        enabled,
        ...rest,
    });

    useEffect(() => {
        if (query.isError) {
            message?.error(
                query.error?.response?.data?.message ||
                "Lỗi khi lấy danh sách lớp học",
            );
        }
    }, [query.isError, query.error]);

    return {
        allClass: query.data || [],
        loading: query.isLoading || query.isFetching,
        isError: query.isError,
        refetch: query.refetch,
        query,
    };
};

export default useAllClass;
