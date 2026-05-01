import { Layout } from 'antd';
import AppHeader from '../AppHeader/AppHeader';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh', width: '100%' }}>
      <AppHeader />

      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;