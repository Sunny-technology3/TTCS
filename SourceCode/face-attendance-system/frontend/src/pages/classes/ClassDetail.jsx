import { Tabs, Typography, Breadcrumb, message, Spin, Button, Space } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import StudentTab from './features/StudentTab';
import SessionTab from './features/SessionTab';
import { useEffect, useState } from 'react';
import classApi from '../../api/classApi';
import attendanceApi from '../../api/attendanceApi';
import { DownloadOutlined } from '@ant-design/icons';

const { Title } = Typography;

function ClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const fetchClassData = async () => {
            setLoading(true);

            try {
                const res = await classApi.getDetailClass(classId);

                setClassData(res.data.data);
            } catch (error) {
                message.error(error?.response?.data?.message || "Lỗi khi lấy thông tin lớp học");
                console.log(error);
            } finally {
                setLoading(false);
            }
        };

        fetchClassData();
    }, [classId]);

    const handleSessionChange = (newSessions) => {
        setClassData((prev) => ({
            ...prev,
            sessions: newSessions,
            sessionCount: newSessions.length
        }));
    };

    const handleStudentChange = (newStudents) => {
        setClassData((prev) => ({
            ...prev,
            students: newStudents,
            studentCount: newStudents.length
        }));
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
            console.log(error);
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
                                style={{ cursor: 'pointer', color: '#1677ff' }}
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

            <Spin spinning={loading}>
                <Space style={{ marginTop: 10, width: '100%', justifyContent: 'space-between' }}>
                    <Title level={3} style={{ margin: 0 }}>
                        {classData?.name ? classData.name : "Đang tải..."}
                    </Title>

                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        loading={exporting}
                        onClick={handleExportAttendance}
                    >
                        Xuất Excel điểm danh
                    </Button>
                </Space>

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
        </div>
    );
};

export default ClassDetail;