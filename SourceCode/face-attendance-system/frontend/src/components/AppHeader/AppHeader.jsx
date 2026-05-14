import { Layout, Dropdown, Avatar, Space, Typography, message } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import lecturerApi from '../../api/lecturerApi';

const { Header } = Layout;
const { Text } = Typography;

function AppHeader() {
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState(null);

  useEffect(() => {
    const fetchLecturer = async () => {
      try {
        const res = await lecturerApi.getLecturer();

        setLecturer(res.data.data);
      } catch (error) {
        console.log(error);
        message.error(error?.response?.data?.message || "Lỗi khi lấy thông tin người dùng");
      }
    };

    fetchLecturer();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  };

  const items = [
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    }
  ];

  return (
    <Header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
        padding: '0 24px',
        borderBottom: '1px solid #eee'
      }}
    >
      <div
        onClick={() => navigate('/classes')}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
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
            fontSize: 24,
          }}
        >
          Hệ thống điểm danh sinh viên
        </span>
      </div>

      <Dropdown menu={{ items }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} />
          <Text>{lecturer?.fullName || "Chưa có thông tin"}</Text>
        </Space>
      </Dropdown>
    </Header>
  );
};

export default AppHeader;