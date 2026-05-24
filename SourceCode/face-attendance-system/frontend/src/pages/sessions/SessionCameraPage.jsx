import {
    Row,
    Col,
    Card,
    Typography,
    Tag,
    List,
    Avatar,
    Statistic,
    Space,
    Button,
    Spin,
    message,
    Breadcrumb,
    Tabs,
    Empty,
    Input,
} from "antd";
import { useState } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import {
    VideoCameraOutlined,
    UserOutlined,
    CheckCircleOutlined,
    StopOutlined,
    ReloadOutlined,
    ClockCircleOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import useClassDetail from "../../hooks/useClassDetail";
import useSessionDetail from "../../hooks/useSessionDetail";
import useAttendanceBySession from "../../hooks/useAttendanceBySession";
import { useQueryClient } from "@tanstack/react-query";
import sessionApi from "../../api/sessionApi";
const { Title, Text } = Typography;
import dayjs from 'dayjs';
import { normalizeText } from "../../utils/string";
import attendanceStreamApi from "../../api/attendanceStreamApi";

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

function SessionCameraPage() {
    const { classId, sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchText, setSearchText] = useState("");

    const {
        classDetail: classData,
        loading: classLoading,
    } = useClassDetail(classId);

    const {
        sessionDetail: sessionData,
        loading: sessionLoading,
    } = useSessionDetail(sessionId);

    const {
        attendanceData,
        loading: attendanceLoading,
        refetch,
    } = useAttendanceBySession(classId, sessionId);

    const stats = {
        present: attendanceData?.filter(i => i.status === "present").length || 0,
        late: attendanceData?.filter(i => i.status === "late").length || 0,
        absent: attendanceData?.filter(i => i.status === "absent").length || 0,
        total: attendanceData?.length || 0,
    };

    const recognizedStudents = (attendanceData || []).filter(
        (item) => item.status !== "absent"
    );

    const filterStudents = (list) => {
        const keyword = normalizeText(searchText);

        return list.filter((item) => {
            const fullName = normalizeText(item.fullName || "");
            const studentId = normalizeText(item.studentId || "");

            return (
                fullName.includes(keyword) ||
                studentId.includes(keyword)
            );
        });
    };

    const filteredRecognizedStudents = filterStudents(
        recognizedStudents
    );

    const filteredAbsentStudents = filterStudents(
        (attendanceData || []).filter(
            (item) => item.status === "absent"
        )
    );

    const handleUpdateSessionStatus = async (status) => {
        try {
            await sessionApi.updateStatusSession(sessionId, status);

            queryClient.setQueryData(
                ["sessionDetail", sessionId],
                (oldData) => ({
                    ...oldData,
                    status,
                })
            );

            message.success("Cập nhật trạng thái phiên học thành công");
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                "Có lỗi xảy ra khi cập nhật trạng thái phiên học"
            );
        }
    };

    const loading =
        classLoading ||
        sessionLoading ||
        attendanceLoading;

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
                                onClick={() => navigate(`/classes/${classId}`)}
                            >
                                {classData?.name || "Đang tải..."}
                            </span>
                        )
                    },
                    {
                        title: (
                            <span
                                style={{ cursor: 'pointer', color: '#1677ff' }}
                                onClick={() => navigate(`/classes/${classId}/sessions/${sessionId}`)}
                            >
                                {sessionData?.name || "Đang tải..."}
                            </span>
                        )
                    },
                    {
                        title: "Camera realtime"
                    }
                ]}
            />

            <Spin spinning={loading}>
                <div style={{ marginTop: 10 }}>
                    <Card style={{ marginBottom: 20 }}>
                        <Row justify="space-between" align="top" gutter={[24, 24]}>
                            <Col>
                                <Title level={4} style={{ margin: 0 }}>
                                    Giám sát camera phiên học
                                </Title>

                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">
                                        Lớp: {classData?.name || "---"}
                                    </Text>

                                    <br />

                                    <Text type="secondary">
                                        Buổi học: {sessionData?.name || "---"}
                                    </Text>

                                    <br />

                                    <Text type="secondary">
                                        <strong>Bắt đầu:</strong>{" "}
                                        {sessionData?.startTime
                                            ? dayjs(sessionData.startTime).format("DD/MM/YYYY HH:mm")
                                            : "---"}
                                    </Text>

                                    <br />

                                    <Text type="secondary">
                                        <strong>Kết thúc:</strong>{" "}
                                        {sessionData?.endTime
                                            ? dayjs(sessionData.endTime).format("DD/MM/YYYY HH:mm")
                                            : "---"}
                                    </Text>
                                </div>
                            </Col>

                            <Col flex="auto">
                                <Row gutter={16} justify="end">
                                    <Col style={{ textAlign: "center" }}>
                                        <Card size="small">
                                            <Statistic
                                                title="Tổng SV"
                                                value={stats.total}
                                                prefix={<UserOutlined />}
                                            />
                                        </Card>
                                    </Col>

                                    <Col style={{ textAlign: "center" }}>
                                        <Card size="small">
                                            <Statistic
                                                title="Có mặt"
                                                value={stats.present}
                                                valueStyle={{ color: "#52c41a" }}
                                                prefix={<CheckCircleOutlined />}
                                            />
                                        </Card>
                                    </Col>

                                    <Col style={{ textAlign: "center" }}>
                                        <Card size="small">
                                            <Statistic
                                                title="Đi muộn"
                                                value={stats.late}
                                                valueStyle={{ color: "#faad14" }}
                                                prefix={<ClockCircleOutlined />}
                                            />
                                        </Card>
                                    </Col>

                                    <Col style={{ textAlign: "center" }}>
                                        <Card size="small">
                                            <Statistic
                                                title="Vắng"
                                                value={stats.absent}
                                                valueStyle={{ color: "#ff4d4f" }}
                                                prefix={<StopOutlined />}
                                            />
                                        </Card>
                                    </Col>
                                </Row>

                                <div
                                    style={{
                                        marginTop: 16,
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 12,
                                    }}
                                >
                                    <Tag
                                        color={SESSION_STATUS_MAP[sessionData?.status]?.color}
                                        style={{
                                            padding: "6px 14px",
                                            fontSize: 14,
                                        }}
                                    >
                                        {SESSION_STATUS_MAP[sessionData?.status]?.label}
                                    </Tag>

                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={refetch}
                                        loading={attendanceLoading}
                                    >
                                        Làm mới
                                    </Button>

                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        disabled={sessionData?.status !== "in_progress"}
                                        onClick={() =>
                                            handleUpdateSessionStatus("finished")
                                        }
                                    >
                                        Kết thúc
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    <Row gutter={20}>
                        <Col xs={24} md={18}>
                            <Card
                                title={
                                    <Space>
                                        <VideoCameraOutlined />
                                        Camera Realtime
                                    </Space>
                                }
                            >
                                <div
                                    style={{
                                        width: "100%",
                                        height: 600,
                                        background: "#000",
                                        borderRadius: 8,
                                        overflow: "hidden",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center"
                                    }}
                                >
                                    {sessionData?.status === "not_started" && (
                                        <Empty
                                            description={
                                                <span style={{ color: "#ffffff" }}>
                                                    Phiên học chưa bắt đầu
                                                </span>
                                            }
                                        />
                                    )}

                                    {
                                        sessionData?.status === "in_progress" &&
                                        classData?.cameraUrl && (
                                            <img
                                                src={
                                                    attendanceStreamApi.getVideoFeedUrl({
                                                        classId,
                                                        sessionId,
                                                        endTime: sessionData.endTime,
                                                        cameraUrl: classData.cameraUrl
                                                    })
                                                }
                                                alt="camera"
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover"
                                                }}
                                            />
                                        )
                                    }

                                    {sessionData?.status === "finished" && (
                                        <Empty
                                            description={
                                                <span style={{ color: "#ffffff" }}>
                                                    Phiên học đã kết thúc
                                                </span>
                                            }
                                        />
                                    )}
                                </div>
                            </Card>
                        </Col>

                        <Col xs={24} md={6}>
                            <Card
                                title="Kết quả điểm danh"
                                style={{ height: "100%" }}
                            >
                                <Input
                                    allowClear
                                    placeholder="Tìm mã sinh viên hoặc họ tên..."
                                    prefix={<SearchOutlined />}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    style={{ marginBottom: 16 }}
                                />

                                <Tabs
                                    items={[
                                        {
                                            key: "recognized",
                                            label: `Đã điểm danh (${recognizedStudents.length})`,
                                            children: (
                                                recognizedStudents.length > 0 ? (
                                                    <List
                                                        itemLayout="horizontal"
                                                        dataSource={filteredRecognizedStudents}
                                                        renderItem={(item) => (
                                                            <List.Item>
                                                                <List.Item.Meta
                                                                    avatar={
                                                                        <Avatar src={item.avatarUrl} />
                                                                    }
                                                                    title={
                                                                        <Space>
                                                                            <Text strong>
                                                                                {item.fullName}
                                                                            </Text>

                                                                            {ATTENDANCE_STATUS_MAP[item.status] && (
                                                                                <Tag color={ATTENDANCE_STATUS_MAP[item.status].color}>
                                                                                    {ATTENDANCE_STATUS_MAP[item.status].label}
                                                                                </Tag>
                                                                            )}
                                                                        </Space>
                                                                    }
                                                                    description={
                                                                        <>
                                                                            <div>
                                                                                Mã sinh viên: {item.studentId}
                                                                            </div>

                                                                            <div>
                                                                                Check-in: {
                                                                                    item.checkIn
                                                                                        ? dayjs(item.checkIn).format('DD/MM/YYYY HH:mm')
                                                                                        : "---"
                                                                                }
                                                                            </div>
                                                                        </>
                                                                    }
                                                                />
                                                            </List.Item>
                                                        )}
                                                    />
                                                ) : (
                                                    <Empty
                                                        description={
                                                            searchText
                                                                ? "Không tìm thấy sinh viên"
                                                                : "Chưa có sinh viên điểm danh"
                                                        }
                                                    />
                                                )
                                            )
                                        },
                                        {
                                            key: "absent",
                                            label: `Chưa điểm danh (${stats.absent})`,
                                            children: (
                                                stats.absent > 0 ? (
                                                    <List
                                                        itemLayout="horizontal"
                                                        dataSource={filteredAbsentStudents}
                                                        renderItem={(item) => (
                                                            <List.Item>
                                                                <List.Item.Meta
                                                                    avatar={
                                                                        <Avatar src={item.avatarUrl} />
                                                                    }
                                                                    title={
                                                                        <Text strong>
                                                                            {item.fullName}
                                                                        </Text>
                                                                    }
                                                                    description={
                                                                        <>
                                                                            <div>
                                                                                Mã sinh viên: {item.studentId}
                                                                            </div>

                                                                            <Tag color="red">
                                                                                Vắng mặt
                                                                            </Tag>
                                                                        </>
                                                                    }
                                                                />
                                                            </List.Item>
                                                        )}
                                                    />
                                                ) : (
                                                    <Empty
                                                        description={
                                                            searchText
                                                                ? "Không tìm thấy sinh viên"
                                                                : "Tất cả sinh viên đã điểm danh"
                                                        }
                                                    />
                                                )
                                            )
                                        }
                                    ]}
                                />
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Spin>
        </div>
    );
}

export default SessionCameraPage;