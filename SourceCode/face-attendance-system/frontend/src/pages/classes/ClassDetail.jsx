import {
    Tabs,
    Typography,
    Breadcrumb,
    message,
    Spin,
    Button,
    Space,
    Form,
    Modal,
    Input,
    Row,
    Col,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import StudentTab from './features/StudentTab';
import SessionTab from './features/SessionTab';
import { useState } from 'react';
import attendanceApi from '../../api/attendanceApi';
import {
    DownloadOutlined,
    ReloadOutlined,
    EditOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import useClassDetail from '../../hooks/useClassDetail';
import classApi from '../../api/classApi';

const { Title } = Typography;

function ClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [exporting, setExporting] = useState(false);
    const [open, setOpen] = useState(false);
    const [form] = Form.useForm();

    const openEdit = () => {
        if (!classData) return;

        form.setFieldsValue({
            name: classData?.name,
            cameraUrl: classData?.cameraUrl,
        });

        setOpen(true);
    };

    const {
        classDetail: classData,
        loading: classLoading,
        refetch,
    } = useClassDetail(classId);

    const handleSessionChange = (newSessions) => {
        queryClient.setQueryData(
            ["classDetail", classId],
            (oldData) => ({
                ...oldData,
                sessions: newSessions,
                sessionCount: newSessions.length,
            })
        );
    };

    const handleStudentChange = (newStudents) => {
        queryClient.setQueryData(
            ["classDetail", classId],
            (oldData) => ({
                ...oldData,
                students: newStudents,
                studentCount: newStudents.length,
            })
        );
    };

    const handleSubmit = async (values) => {
        try {
            await classApi.updateClass(classId, values);

            queryClient.invalidateQueries({
                queryKey: ["classDetail", classId],
            });

            queryClient.invalidateQueries({
                queryKey: ["allClass"],
            });

            message.success("Cập nhật lớp học thành công");

            setOpen(false);
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                "Cập nhật lớp học thất bại"
            );
        }
    };

    const getDownloadFileName = (contentDisposition) => {
        if (!contentDisposition) {
            return `Kết quả điểm danh - ${classData?.name || classId}.xlsx`;
        }

        const encodedFileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

        if (encodedFileNameMatch?.[1]) {
            return decodeURIComponent(encodedFileNameMatch[1]);
        }

        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

        return fileNameMatch?.[1] || `Kết quả điểm danh - ${classData?.name || classId}.xlsx`;
    };

    const handleExportAttendance = async () => {
        setExporting(true);

        try {
            const response = await attendanceApi.exportAttendanceByClass(classId);
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
            message.error(error?.response?.data?.message || "Xuất danh sách điểm danh thất bại");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <Breadcrumb
                items={[
                    {
                        title: (
                            <span
                                onClick={() => navigate('/classes')}
                                style={{
                                    cursor: 'pointer',
                                    color: '#1677ff',
                                    fontWeight: 500,
                                }}
                            >
                                Danh sách lớp học
                            </span>
                        )
                    },
                    {
                        title: classData?.name || "Đang tải..."
                    }
                ]}
            />

            <Spin spinning={classLoading}>
                <Row
                    gutter={[12, 12]}
                    align="middle"
                    justify="space-between"
                    style={{ marginTop: 10 }}
                >
                    <Col xs={24} md={12}>
                        <Title level={3} style={{ margin: 0 }}>
                            {classData?.name ? classData.name : "Đang tải..."}
                        </Title>
                    </Col>

                    <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <Button icon={<EditOutlined />} onClick={openEdit}>
                                Sửa lớp
                            </Button>

                            <Button
                                icon={<DownloadOutlined />}
                                loading={exporting}
                                onClick={handleExportAttendance}
                            >
                                Xuất Excel
                            </Button>

                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => refetch()}
                                loading={classLoading}
                            >
                                Làm mới
                            </Button>
                        </Space>
                    </Col>
                </Row>

                {!classData ? null : (
                    <Tabs
                        items={[
                            {
                                key: 'students',
                                label: `Sinh viên (${classData.studentCount || 0})`,
                                children: (
                                    <StudentTab
                                        students={classData.students}
                                        classId={classId}
                                        onStudentChange={handleStudentChange}
                                    />
                                )
                            },
                            {
                                key: 'sessions',
                                label: `Phiên học (${classData.sessionCount || 0})`,
                                children: (
                                    <SessionTab
                                        sessions={classData.sessions}
                                        classId={classId}
                                        onSessionChange={handleSessionChange}
                                    />
                                )
                            }
                        ]}
                    />
                )}
            </Spin>

            <Modal
                open={open}
                title={"Sửa lớp học"}
                okText={"Cập nhật"}
                cancelText={"Hủy"}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>

                    <Form.Item
                        name="name"
                        label="Tên lớp"
                        rules={[{ required: true, message: "Vui lòng nhập tên lớp" }]}
                    >
                        <Input placeholder="Nhập tên lớp học" />
                    </Form.Item>

                    <Form.Item
                        name="cameraUrl"
                        label="Camera URL"
                        rules={[{ required: true, message: "Vui lòng nhập Camera url" }]}
                    >
                        <Input placeholder="VD: http://192.168.1.5:8080/video" />
                    </Form.Item>

                </Form>
            </Modal>
        </div>
    );
};

export default ClassDetail;
