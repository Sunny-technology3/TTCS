import {
    Card,
    Form,
    Input,
    Button,
    Typography,
    message,
    Space,
    Row,
    Col,
} from 'antd';
import {
    TeamOutlined,
    SafetyCertificateOutlined,
    CameraOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import loginApi from '../../api/loginApi';

const { Title, Text } = Typography;

function FeatureItem({ icon, text }) {
    return (
        <Space size={16} align="center">
            <div
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                }}
            >
                {icon}
            </div>

            <Text
                style={{
                    color: "#fff",
                    fontSize: 15,
                }}
            >
                {text}
            </Text>
        </Space>
    );
};

function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);

        try {
            const response = await loginApi.login(values);

            const token = response.data.token;

            localStorage.setItem("token", token);

            message.success("Đăng nhập thành công");

            navigate("/classes");
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                "Đăng nhập thất bại"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#f5f7fb',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                overflowY: 'auto',
                padding: '100px 16px',
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 980,
                    borderRadius: 24,
                    overflow: 'visible',
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                }}
                bodyStyle={{ padding: 0 }}
            >
                <Row>
                    <Col
                        xs={24}
                        md={12}
                        style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: '#fff',
                            padding: '48px 40px',
                            display: 'flex',
                            alignItems: 'flex-start',
                        }}
                    >
                        <div style={{ width: '100%' }}>
                            <img
                                src="/logo.png"
                                alt="logo"
                                style={{
                                    width: 90,
                                    height: 90,
                                    objectFit: 'contain',
                                    margin: '0 auto 24px',
                                    display: 'block',
                                }}
                            />

                            <Title
                                level={2}
                                style={{
                                    color: '#fff',
                                    marginBottom: 12,
                                    lineHeight: 1.3,
                                }}
                            >
                                Hệ thống điểm danh sinh viên
                            </Title>

                            <Text
                                style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: 16,
                                    display: 'block',
                                    lineHeight: 1.8,
                                }}
                            >
                                Ứng dụng điểm danh sử dụng công nghệ nhận diện
                                khuôn mặt theo thời gian thực giúp quản lý lớp
                                học nhanh chóng và chính xác.
                            </Text>

                            <Space
                                direction="vertical"
                                size={20}
                                style={{ marginTop: 40 }}
                            >
                                <FeatureItem
                                    icon={<CameraOutlined />}
                                    text="Nhận diện khuôn mặt realtime"
                                />

                                <FeatureItem
                                    icon={<TeamOutlined />}
                                    text="Quản lý lớp học và sinh viên"
                                />

                                <FeatureItem
                                    icon={<SafetyCertificateOutlined />}
                                    text="Xuất báo cáo và lưu trữ dữ liệu"
                                />
                            </Space>
                        </div>
                    </Col>

                    <Col
                        xs={24}
                        md={12}
                        style={{
                            padding: '48px 40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fff',
                        }}
                    >
                        <div style={{ width: '100%', maxWidth: 360 }}>
                            <div style={{ textAlign: 'center', marginBottom: 36 }}>
                                <div
                                    style={{
                                        width: 50,
                                        height: 4,
                                        background: 'linear-gradient(90deg, #4facfe, #00f2fe)',
                                        borderRadius: 10,
                                        margin: '0 auto 16px',
                                    }}
                                />

                                <Title
                                    level={2}
                                    style={{
                                        marginBottom: 6,
                                        fontWeight: 700,
                                    }}
                                >
                                    Đăng nhập
                                </Title>

                                <Text
                                    style={{
                                        color: '#8c8c8c',
                                        fontSize: 14,
                                    }}
                                >
                                    Truy cập hệ thống điểm danh sinh viên bằng tài khoản của bạn
                                </Text>
                            </div>

                            <Form
                                layout="vertical"
                                onFinish={onFinish}
                            >
                                <Form.Item
                                    label="Tài khoản"
                                    name="username"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Hãy nhập tài khoản',
                                        },
                                    ]}
                                >
                                    <Input
                                        size="large"
                                        placeholder="Nhập tài khoản"
                                    />
                                </Form.Item>

                                <Form.Item
                                    label="Mật khẩu"
                                    name="password"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Hãy nhập mật khẩu',
                                        },
                                    ]}
                                >
                                    <Input.Password
                                        size="large"
                                        placeholder="Nhập mật khẩu"
                                    />
                                </Form.Item>

                                <Form.Item style={{ marginTop: 24 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        block
                                        size="large"
                                        loading={loading}
                                        style={{
                                            height: 46,
                                            borderRadius: 10,
                                            fontWeight: 600,
                                        }}
                                    >
                                        Đăng nhập
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </Card>
        </div>
    );
}

export default Login;