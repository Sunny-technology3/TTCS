import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
    }
};

function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <Result
                status="404"
                title="404"
                subTitle="Trang bạn đang tìm không tồn tại."
                extra={[
                    <Button type="primary" key="home" onClick={() => navigate('/classes')}>
                        Về trang chủ
                    </Button>,
                    <Button key="back" onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                ]}
            />
        </div>
    );
};

export default NotFound;