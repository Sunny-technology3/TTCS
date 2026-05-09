import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import loginApi from '../../api/loginApi';

const { Title, Text } = Typography;

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5'
    },
    card: {
        width: 360,
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        borderRadius: 10
    }
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
            console.log(error);
            message.error(error?.response?.data?.message || "Đăng nhập thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <Card style={styles.card}>
                <Title level={3} style={{ textAlign: 'center' }}>
                    Hệ thống điểm danh
                </Title>

                <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: 20 }}>
                    Đăng nhập để tiếp tục
                </Text>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Tài khoản"
                        name="username"
                        rules={[{ required: true, message: 'Hãy nhập tài khoản' }]}
                    >
                        <Input placeholder="Nhập tài khoản" />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[{ required: true, message: 'Hãy nhập mật khẩu' }]}
                    >
                        <Input.Password placeholder="Nhập mật khẩu" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;