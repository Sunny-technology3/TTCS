import {
    Table,
    Button,
    Space,
    Tooltip,
    Modal,
    Form,
    Input,
    DatePicker,
    message,
    Popconfirm,
    Tag,
    Upload,
} from 'antd';
import {
    PlusOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    StopOutlined,
    UploadOutlined,
    DownloadOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import sessionApi from '../../../api/sessionApi';

const SESSION_STATUS_MAP = {
    not_started: { label: "Chưa bắt đầu", color: "blue" },
    in_progress: { label: "Đang diễn ra", color: "green" },
    finished: { label: "Đã kết thúc", color: "red" },
};

function SessionTab({ sessions, classId, onSessionChange }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [data, setData] = useState(sessions);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [importing, setImporting] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        setOpen(true)
    };

    const openEdit = (record) => {
        setEditing(record);

        form.setFieldsValue({
            ...record,
            startTime: record.startTime ? dayjs(record.startTime) : null,
            endTime: record.endTime ? dayjs(record.endTime) : null,
        });

        setOpen(true);
    };

    const handleSubmit = async (values) => {
        const payload = {
            ...values,
            classId,
            startTime: values.startTime?.toISOString(),
            endTime: values.endTime?.toISOString(),
        };

        try {
            if (editing) {
                const res = await sessionApi.updateSession(
                    editing._id,
                    payload
                );

                const updatedData = data.map((item) =>
                    item._id === editing._id ? res.data.data : item
                );

                setData(updatedData);
                onSessionChange?.(updatedData);

                message.success("Cập nhật thành công");
            } else {
                const res = await sessionApi.createSession(payload);

                const newData = [...data, res.data.data];

                setData(newData);
                onSessionChange?.(newData);

                message.success("Tạo thành công");
            }

            setOpen(false);
            form.resetFields();
            setEditing(null);
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleDelete = async (id) => {
        try {
            await sessionApi.deleteSession(id);

            const newData = data.filter((item) => item._id !== id);

            setData(newData);
            onSessionChange?.(newData);

            message.success("Xóa thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Xóa thất bại");
        }
    };

    const handleUpdateStatusSession = async (id, status) => {
        try {
            await sessionApi.updateStatusSession(id, status);

            setData((prev) =>
                prev.map((item) =>
                    item._id === id ? { ...item, status } : item
                )
            );

            message.success("Cập nhật trạng thái thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        }
    };

    const handleImportSessions = async (file) => {
        setImporting(true);

        try {
            const formData = new FormData();

            formData.append("file", file);
            formData.append("classId", classId);

            const res = await sessionApi.importSessions(formData);

            const newData = [...data, ...res.data.data];

            setData(newData);

            onSessionChange?.(newData);

            message.success("Import phiên học thành công");

        } catch (error) {
            console.log(error);

            message.error(
                error?.response?.data?.message ||
                "Import thất bại"
            );
        } finally {
            setImporting(false);
        }

        return false;
    };

    const handleDownloadTemplate = async () => {
        setDownloading(true);

        try {
            const response = await sessionApi.downloadSessionTemplate();

            const blob = new Blob(
                [response.data],
                {
                    type: response.headers["content-type"],
                }
            );

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = url;
            link.download = "Biểu mẫu danh sách phiên học.xlsx";

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            message.success("Tải file mẫu thành công");
        } catch (error) {
            console.log(error);
            message.error("Tải file mẫu thất bại");
        } finally {
            setDownloading(false);
        }
    };

    const columns = [
        { title: 'Tên', dataIndex: 'name' },
        {
            title: 'Bắt đầu',
            dataIndex: 'startTime',
            render: (value) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : ""
        },
        {
            title: 'Kết thúc',
            dataIndex: 'endTime',
            render: (value) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : ""
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (value) => {
                const status = SESSION_STATUS_MAP[value];

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
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Bắt đầu">
                        <Button
                            type="text"
                            icon={<PlayCircleOutlined />}
                            disabled={record.status !== "not_started"}
                            onClick={() =>
                                handleUpdateStatusSession(
                                    record._id,
                                    "in_progress",
                                )
                            }
                        />
                    </Tooltip>

                    <Tooltip title="Kết thúc">
                        <Button
                            type="text"
                            icon={<StopOutlined />}
                            disabled={record.status !== "in_progress"}
                            onClick={() =>
                                handleUpdateStatusSession(
                                    record._id,
                                    "finished",
                                )
                            }
                        />
                    </Tooltip>

                    <Tooltip title="Xem điểm danh">
                        <Button
                            type="text"
                            icon={<EyeOutlined />}
                            onClick={() =>
                                navigate(`/classes/${classId}/sessions/${record._id}`)
                            }
                        />
                    </Tooltip>

                    <Tooltip title="Sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            disabled={record.status !== "not_started"}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>

                    <Popconfirm
                        title="Xóa phiên học?"
                        onConfirm={() => handleDelete(record._id)}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Space
                style={{
                    width: "100%",
                    justifyContent: "flex-end",
                    marginTop: 16,
                }}
                wrap
            >
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Thêm phiên học
                </Button>

                <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleImportSessions}
                >
                    <Button
                        icon={<UploadOutlined />}
                        loading={importing}
                    >
                        Import Excel
                    </Button>
                </Upload>

                <Button
                    icon={<DownloadOutlined />}
                    loading={downloading}
                    onClick={handleDownloadTemplate}
                >
                    Tải file mẫu
                </Button>
            </Space>

            <Table
                style={{ marginTop: 16 }}
                dataSource={data}
                columns={columns}
                rowKey="_id"
                scroll={{ x: "max-content" }}
                locale={"Chưa có phiên học nào"}
            />

            <Modal
                open={open}
                title={editing ? "Sửa buổi học" : "Thêm buổi học"}
                okText={editing ? "Cập nhật" : "Tạo buổi"}
                cancelText={"Hủy"}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Tên buổi"
                        rules={[{ required: true, message: 'Vui lòng nhập tên buổi' }]}
                    >
                        <Input placeholder="VD: Buổi 1, Buổi 2..." />
                    </Form.Item>

                    <Form.Item
                        name="startTime"
                        label="Thời gian bắt đầu"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu' }]}
                    >
                        <DatePicker
                            showTime={{
                                format: 'HH:mm',
                            }}
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Chọn thời gian bắt đầu"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="endTime"
                        label="Thời gian kết thúc"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian kết thúc' }]}
                    >
                        <DatePicker
                            showTime={{
                                format: 'HH:mm',
                            }}
                            format="DD/MM/YYYY HH:mm"
                            placeholder="Chọn thời gian kết thúc"
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default SessionTab;