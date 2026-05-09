import { Table, Typography, Breadcrumb, Spin, message, Button, Tooltip, Space, Tag } from 'antd';
import { ReloadOutlined, PlayCircleOutlined, StopOutlined, CheckOutlined, DownloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import attendanceApi from '../../api/attendanceApi';
import classApi from '../../api/classApi';
import sessionApi from '../../api/sessionApi';
import dayjs from 'dayjs';

const { Title } = Typography;

const ATTENDANCE_STATUS_MAP = {
    present: { label: "Có mặt", color: "green" },
    late: { label: "Đi muộn", color: "orange" },
    absent: { label: "Vắng mặt", color: "red" },
};

const SESSION_STATUS_MAP = {
    not_started: { label: "Chưa bắt đầu", color: "blue" },
    in_progress: { label: "Đang diễn ra", color: "green" },
    finished: { label: "Đã kết thúc", color: "red" },
};

function SessionDetail() {
    const { classId, sessionId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [classData, setClassData] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchClassData = async () => {
            setLoading(true);

            try {
                const res = await classApi.getDetailClass(classId);

                setClassData(res.data.data);
            } catch (error) {
                console.log(error);
                message.error(error?.response?.data?.message || "Lỗi khi lấy thông tin lớp học");
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [classId]);

    useEffect(() => {
        const fetchSessionData = async () => {
            setLoading(true);

            try {
                const res = await sessionApi.getDetailSession(sessionId);

                setSessionData(res.data.data);
            } catch (error) {
                console.log(error);
                message.error(error?.response?.data?.message || "Lỗi khi lấy thông tin phiên học");
            } finally {
                setLoading(false);
            }
        };

        fetchSessionData();
    }, [sessionId]);

    const fetchAttendance = async (classId, sessionId) => {
        setLoading(true);

        try {
            const res = await attendanceApi.getAttendanceBySession(classId, sessionId);

            setData(res.data.data);
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Lỗi khi lấy danh sách điểm danh");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!classId || !sessionId) return;

        fetchAttendance(classId, sessionId);
    }, [classId, sessionId]);

    const handleUpdateAttendanceStatus = async (sessionId, studentId, status) => {
        try {
            const res = await attendanceApi.updateAttendanceStatus(sessionId, studentId, status);

            const updated = res.data.data;

            setData((prev) =>
                prev.map((item) =>
                    item._id === studentId ? { ...item, ...updated } : item
                )
            );

            message.success("Cập nhật trạng thái thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleUpdateSessionStatus = async (status) => {
        try {
            await sessionApi.updateStatusSession(sessionId, status);

            setSessionData((prev) => ({
                ...prev,
                status,
            }));

            message.success("Cập nhật trạng thái phiên học thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleMarkAll = async () => {
        try {
            await attendanceApi.markAllPresent({
                classId,
                sessionId
            });

            message.success("Điểm danh tất cả thành công");

            fetchAttendance(classId, sessionId);
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const getDownloadFileName = (contentDisposition) => {
        if (!contentDisposition) {
            return `Kết quả điểm danh - ${sessionData?.name || sessionId}.xlsx`;
        }

        const encodedFileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

        if (encodedFileNameMatch?.[1]) {
            return decodeURIComponent(encodedFileNameMatch[1]);
        }

        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

        return fileNameMatch?.[1] || `Kết quả điểm danh - ${sessionData?.name || sessionId}.xlsx`;
    };

    const handleExportAttendance = async () => {
        setExporting(true);

        try {
            const response = await attendanceApi.exportAttendanceBySession(sessionId);
            const blob = new Blob(
                [response.data],
                {
                    type: response.headers["content-type"]
                        || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
            );
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = downloadUrl;
            link.download = getDownloadFileName(response.headers["content-disposition"]);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            message.success("Xuất danh sách điểm danh thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Xuất danh sách điểm danh thất bại");
        } finally {
            setExporting(false);
        }
    };

    const columns = [
        { title: 'Mã sinh viên', dataIndex: 'studentId' },
        { title: 'Họ và tên', dataIndex: 'fullName' },
        {
            title: 'Thời gian vào học',
            dataIndex: 'checkIn',
            render: (value) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : "---"
        },
        {
            title: 'Điểm danh',
            dataIndex: 'status',
            render: (value) => {
                const status = ATTENDANCE_STATUS_MAP[value];

                return status ? (
                    <Tag color={status.color}>{status.label}</Tag>
                ) : (
                    value
                );
            }
        },
        {
            title: 'Thao tác',
            align: 'left',
            width: 180,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Có mặt">
                        <Button
                            type="text"
                            icon={<PlayCircleOutlined />}
                            disabled={record.status !== "absent"}
                            onClick={() =>
                                handleUpdateAttendanceStatus(
                                    sessionId,
                                    record._id,
                                    "present",
                                )
                            }
                        />
                    </Tooltip>

                    <Tooltip title="Đến muộn">
                        <Button
                            type="text"
                            icon={<StopOutlined />}
                            disabled={record.status !== "absent"}
                            onClick={() =>
                                handleUpdateAttendanceStatus(
                                    sessionId,
                                    record._id,
                                    "late",
                                )
                            }
                        />
                    </Tooltip>
                </Space>
            )
        },
    ];

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        title: (
                            <span
                                style={{ cursor: 'pointer', color: '#1677ff' }}
                                onClick={() => navigate('/classes')}
                            >
                                Danh sách lớp học
                            </span>
                        )
                    },
                    {
                        title: (
                            <span
                                style={{ cursor: 'pointer', color: '#1677ff' }}
                                onClick={() => navigate(`/classes/${classData?._id}`)}
                            >
                                {classData?.name || "Đang tải..."}
                            </span>
                        )
                    },
                    { title: (<span>{sessionData?.name || "Đang tải..."}</span>) }
                ]}
            />

            <Spin spinning={loading}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        {sessionData?.name ? sessionData.name : "Đang tải..."} - Điểm danh
                    </Title>

                    <Space>
                        <Tooltip title="Bắt đầu">
                            <Button
                                icon={<PlayCircleOutlined />}
                                disabled={sessionData?.status !== "not_started"}
                                onClick={() => handleUpdateSessionStatus("in_progress")}
                            >
                                Bắt đầu
                            </Button>
                        </Tooltip>

                        <Tooltip title="Kết thúc">
                            <Button
                                icon={<StopOutlined />}
                                danger
                                disabled={sessionData?.status !== "in_progress"}
                                onClick={() => handleUpdateSessionStatus("finished")}
                            >
                                Kết thúc
                            </Button>
                        </Tooltip>

                        <Tooltip title="Điểm danh tất cả">
                            <Button
                                icon={<CheckOutlined />}
                                onClick={handleMarkAll}
                            >
                                Điểm danh tất cả
                            </Button>
                        </Tooltip>

                        <Tooltip title="Xuất Excel">
                            <Button
                                icon={<DownloadOutlined />}
                                onClick={handleExportAttendance}
                                loading={exporting}
                            >
                                Xuất Excel
                            </Button>
                        </Tooltip>

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchAttendance(classId, sessionId)}
                            loading={loading}
                        >
                            Làm mới
                        </Button>
                    </Space>
                </div>

                <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <Space size="large">
                        <div>
                            <strong>Bắt đầu:</strong>{" "}
                            {sessionData?.startTime
                                ? dayjs(sessionData.startTime).format("DD/MM/YYYY HH:mm")
                                : "---"}
                        </div>

                        <div>
                            <strong>Kết thúc:</strong>{" "}
                            {sessionData?.endTime
                                ? dayjs(sessionData.endTime).format("DD/MM/YYYY HH:mm")
                                : "---"}
                        </div>

                        <div>
                            <strong>Trạng thái:</strong>{" "}
                            {sessionData?.status && (
                                <Tag color={SESSION_STATUS_MAP[sessionData.status]?.color}>
                                    {SESSION_STATUS_MAP[sessionData.status]?.label}
                                </Tag>
                            )}
                        </div>
                    </Space>
                </div>

                <Table
                    dataSource={data}
                    columns={columns}
                    rowKey="_id"
                />
            </Spin>
        </div>
    );
};

export default SessionDetail;
