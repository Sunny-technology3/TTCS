import {
  Layout,
  Dropdown,
  Avatar,
  Space,
  Typography,
  message,
  Form,
  Modal,
  Input,
  Button,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import lecturerApi from '../../api/lecturerApi';

const { Header } = Layout;
const { Text } = Typography;

function AppHeader() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState(null);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchLecturer = async () => {
      try {
        const res = await lecturerApi.getLecturer();

        setLecturer(res.data.data);
      } catch (error) {
        message.error(error?.response?.data?.message || "Lỗi khi lấy thông tin người dùng");
      }
    };

    fetchLecturer();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  };

  const handleChangePassword = async (values) => {
    setLoading(true);

    try {
      await lecturerApi.changePassword(values);

      message.success("Đổi mật khẩu thành công");

      setOpenChangePassword(false);
      form.resetFields();
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
        "Đổi mật khẩu thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  const items = [
    {
      key: 'change-password',
      label: 'Đổi mật khẩu',
      icon: <LockOutlined />,
      onClick: () => setOpenChangePassword(true)
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <>
      <Header
        style={{
          background: '#fff',
          padding: '6px 16px',
          borderBottom: '1px solid #eee',
          height: 'auto',
          lineHeight: 'normal',
        }}
      >
        <Row
          align="middle"
          justify="space-between"
          wrap={true}
        >
          <Col xs={24} md={12}>
            <div
              onClick={() => navigate('/classes')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                flexWrap: 'wrap',
              }}
            >
              <img
                src="/logo.png"
                alt="logo"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  objectFit: "contain",
                }}
              />

              <span
                style={{
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: 1.2,
                }}
              >
                Hệ thống điểm danh sinh viên
              </span>
            </div>
          </Col>

          <Col
            xs={24}
            md={12}
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 8,
            }}
          >
            <Dropdown menu={{ items }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text>
                  {lecturer?.fullName || "Chưa có thông tin"}
                </Text>
              </Space>
            </Dropdown>
          </Col>
        </Row>
      </Header>

      <Modal
        open={openChangePassword}
        title="Đổi mật khẩu"
        onCancel={() => {
          setOpenChangePassword(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mật khẩu hiện tại"
              }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mật khẩu mới"
              },
              {
                min: 8,
                message: "Mật khẩu phải có ít nhất 8 ký tự"
              }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              {
                required: true,
                message: "Vui lòng xác nhận mật khẩu"
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp")
                  );
                }
              })
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
          >
            Cập nhật mật khẩu
          </Button>
        </Form>
      </Modal>
    </>
  );
};

export default AppHeader;