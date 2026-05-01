import { Tabs, Typography, Breadcrumb, message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import StudentTab from './features/StudentTab';
import SessionTab from './features/SessionTab';
import { useEffect, useState } from 'react';
import classApi from '../../api/classApi';

const { Title } = Typography;

function ClassDetail() {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classData, setClassData] = useState(null);
    const [loading, setLoading] = useState(false);

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
                <Title level={3} style={{ marginTop: 10 }}>
                    {classData?.name ? classData.name : "Đang tải..."}
                </Title>

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