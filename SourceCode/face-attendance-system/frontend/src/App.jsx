import { Layout } from 'antd';
import { Route, Routes } from 'react-router-dom';
import Login from './pages/login/login';
import NotFound from './pages/notFound/notFound';
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import ClassList from './pages/classes/ClassList';
import ClassDetail from './pages/classes/ClassDetail';
import SessionDetail from './pages/sessions/SessionDetail';
import ProtectedRoute from './components/protectedRoute/protectedRoute';
import SessionCameraPage from './pages/sessions/SessionCameraPage';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <div className="app-container">
          <Routes>
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/classes" element={<ClassList />} />
              <Route path="/classes/:classId" element={<ClassDetail />} />
              <Route path="/classes/:classId/sessions/:sessionId" element={<SessionDetail />} />
              <Route path="/classes/:classId/sessions/:sessionId/camera" element={<SessionCameraPage />} />
            </Route>

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </div>
      </Content>
    </Layout>
  );
}

export default App;