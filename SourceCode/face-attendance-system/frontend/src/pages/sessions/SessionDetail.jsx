import {
    Table,
    Typography,
    Breadcrumb,
    Spin,
    message,
    Button,
    Tooltip,
    Space,
    Tag,
    Select,
    Input,
    Form,
    DatePicker,
    Modal,
    Alert,
} from 'antd';
import {
    ReloadOutlined,
    PlayCircleOutlined,
    StopOutlined,
    CheckOutlined,
    DownloadOutlined,
    VideoCameraOutlined,
    EditOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import attendanceApi from '../../api/attendanceApi';
import sessionApi from '../../api/sessionApi';
import dayjs from 'dayjs';
import useClassDetail from '../../hooks/useClassDetail';
import useSessionDetail from '../../hooks/useSessionDetail';
import { useQueryClient } from '@tanstack/react-query';
import useAttendanceBySession from '../../hooks/useAttendanceBySession';
import { normalizeText } from '../../utils/string';

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
    const queryClient = useQueryClient();
    const [exporting, setExporting] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [searchType, setSearchType] = useState("studentId");
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState(null);
    const [openEdit, setOpenEdit] = useState(false);
    const [form] = Form.useForm();

    const {
        classDetail: classData,
        loading: classLoading,
    } = useClassDetail(classId);

    const {
        sessionDetail: sessionData,
        loading: sessionLoading,
    } = useSessionDetail(sessionId);

    const {
        attendanceData: data,
        loading: attendanceLoading,
        refetch: refetchAttendance,
    } = useAttendanceBySession(classId, sessionId, statusFilter);

    const handleUpdateAttendanceStatus = async (sessionId, studentId, status) => {
        try {
            const res = await attendanceApi.updateAttendanceStatus(sessionId, studentId, status);

            const updated = res.data.data;

            queryClient.setQueryData(
                ["attendanceBySession", classId, sessionId, statusFilter],
                (oldData) =>
                    (oldData || []).map((item) =>
                        item._id === studentId
                            ? { ...item, ...updated }
                            : item
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

            queryClient.setQueryData(
                ["sessionDetail", sessionId],
                (oldData = {}) => ({
                    ...oldData,
                    status,
                })
            );

            message.success("Cập nhật trạng thái phiên học thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleMarkAll = async () => {
        setMarkingAll(true);

        try {
            await attendanceApi.markAllPresent({
                classId,
                sessionId
            });

            queryClient.invalidateQueries({
                queryKey: ["attendanceBySession", classId, sessionId, statusFilter]
            });

            message.success("Điểm danh tất cả thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setMarkingAll(false);
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

    const handleEditSession = async (values) => {
        try {
            const payload = {
                startTime: values.startTime.toISOString(),
                endTime: values.endTime.toISOString(),
            };

            const res = await sessionApi.updateSession(
                sessionId,
                payload
            );

            queryClient.setQueryData(
                ["sessionDetail", sessionId],
                res.data.data
            );

            message.success("Cập nhật phiên học thành công");

            setOpenEdit(false);
        } catch (error) {
            console.log(error);
            message.error(
                error?.response?.data?.message ||
                "Có lỗi xảy ra"
            );
        }
    };

    const handleOpenEdit = () => {
        form.setFieldsValue({
            startTime: sessionData?.startTime
                ? dayjs(sessionData.startTime)
                : null,
            endTime: sessionData?.endTime
                ? dayjs(sessionData.endTime)
                : null,
        });

        setOpenEdit(true);
    };

    const filteredData = (data || []).filter((student) => {
        const value = normalizeText(student?.[searchType] || "");
        const keyword = normalizeText(searchText);

        return value.includes(keyword);
    });

    const isFinished = sessionData?.status === "finished" || false;

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
            width: 220,
            render: (_, record) => (
                <Select
                    value={record.status}
                    style={{ width: 140 }}
                    disabled={isFinished}
                    onChange={(value) =>
                        handleUpdateAttendanceStatus(
                            sessionId,
                            record._id,
                            value
                        )
                    }
                    options={[
                        {
                            label: (
                                <Space>
                                    <Tag color="green">
                                        Có mặt
                                    </Tag>
                                </Space>
                            ),
                            value: "present",
                        },
                        {
                            label: (
                                <Space>
                                    <Tag color="orange">
                                        Đi muộn
                                    </Tag>
                                </Space>
                            ),
                            value: "late",
                        },
                        {
                            label: (
                                <Space>
                                    <Tag color="red">
                                        Vắng mặt
                                    </Tag>
                                </Space>
                            ),
                            value: "absent",
                        },
                    ]}
                />
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

            {sessionData?.status === "finished" && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginTop: 16 }}
                    message="Phiên học đã kết thúc"
                    description="Bạn chỉ có thể xem kết quả điểm danh, không thể chỉnh sửa dữ liệu."
                />
            )}

            <Spin spinning={attendanceLoading || classLoading || sessionLoading}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <Title level={3} style={{ margin: 0 }}>
                        {sessionData?.name ? sessionData.name : "Đang tải..."} - Điểm danh
                    </Title>

                    <Space>
                        <Button
                            icon={<EditOutlined />}
                            disabled={sessionData?.status !== "not_started"}
                            onClick={handleOpenEdit}
                        >
                            Sửa phiên học
                        </Button>

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

                        <Button
                            icon={<VideoCameraOutlined />}
                            disabled={sessionData?.status !== "in_progress"}
                            onClick={() =>
                                navigate(
                                    `/classes/${classId}/sessions/${sessionId}/camera`
                                )
                            }
                        >
                            Camera realtime
                        </Button>

                        <Tooltip title="Điểm danh tất cả">
                            <Button
                                icon={<CheckOutlined />}
                                onClick={handleMarkAll}
                                loading={markingAll}
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
                            onClick={refetchAttendance}
                            loading={attendanceLoading}
                        >
                            Làm mới
                        </Button>
                    </Space>
                </div>

                <div style={{ marginTop: 8, marginBottom: 16 }}>
                    <Space
                        style={{
                            width: "100%",
                            justifyContent: "flex-end",
                            marginBottom: 12,
                        }}
                    >
                        <Space.Compact>
                            <Select
                                value={searchType}
                                onChange={setSearchType}
                                style={{ width: 130 }}
                                options={[
                                    { label: "Mã sinh viên", value: "studentId" },
                                    { label: "Họ và tên", value: "fullName" },
                                ]}
                            />

                            <Input
                                allowClear
                                placeholder={
                                    searchType === "studentId"
                                        ? "Nhập mã sinh viên..."
                                        : "Nhập họ tên..."
                                }
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                style={{ width: 240 }}
                            />
                        </Space.Compact>

                        <Space>
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 160 }}
                                placeholder="Trạng thái"
                                allowClear
                                options={[
                                    { label: "Có mặt", value: "present" },
                                    { label: "Đi muộn", value: "late" },
                                    { label: "Vắng mặt", value: "absent" },
                                ]}
                            />
                        </Space>
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
                    dataSource={filteredData}
                    columns={columns}
                    rowKey="_id"
                    locale={{
                        emptyText:
                            searchText || statusFilter
                                ? "Không tìm thấy dữ liệu phù hợp"
                                : "Chưa có dữ liệu điểm danh",
                    }}
                />
            </Spin>

            <Modal
                open={openEdit}
                title="Sửa phiên học"
                okText={"Cập nhật"}
                cancelText={"Hủy"}
                onCancel={() => setOpenEdit(false)}
                onOk={() => form.submit()}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleEditSession}
                >
                    <Form.Item
                        name="startTime"
                        label="Thời gian bắt đầu"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng chọn thời gian bắt đầu"
                            }
                        ]}
                    >
                        <DatePicker
                            showTime={{ format: "HH:mm" }}
                            format="DD/MM/YYYY HH:mm"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="endTime"
                        label="Thời gian kết thúc"
                        rules={[
                            {
                                required: true,
                                message: "Vui lòng chọn thời gian kết thúc"
                            }
                        ]}
                    >
                        <DatePicker
                            showTime={{ format: "HH:mm" }}
                            format="DD/MM/YYYY HH:mm"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SessionDetail;
