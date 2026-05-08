import {
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  Dropdown,
  Popconfirm,
  message,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import classApi from '../../api/classApi';

const { Title, Text } = Typography;

function ClassList() {
  const navigate = useNavigate();
  const [editingClass, setEditingClass] = useState(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);

      try {
        const res = await classApi.getAllClass();

        setClasses(res.data.data);
      } catch (error) {
        console.log(error);
        message.error(error?.response?.data?.message || "Lỗi khi lấy danh sách lớp học");
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleSubmit = async (values) => {
    try {
      if (editingClass) {
        const res = await classApi.updateClass(editingClass._id, values);

        message.success("Cập nhật lớp thành công");

        setClasses(prev =>
          prev.map(item =>
            item._id === editingClass._id ? res.data.data : item
          )
        );
      } else {
        const res = await classApi.createClass(values);

        message.success("Tạo lớp thành công");

        setClasses(prev => [...prev, res.data.data]);
      }

      setOpen(false);
      setEditingClass(null);
      form.resetFields();

    } catch (error) {
      console.log(error);
      message.error(error?.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (classId) => {
    try {
      await classApi.deleteClass(classId);

      message.success("Xóa lớp thành công");

      setClasses((prev) => prev.filter((item) => item._id !== classId));
    } catch (error) {
      console.log(error);
      message.error(error?.response?.data?.message || "Xóa lớp thất bại");
    }
  };

  const goToClass = (id) => {
    navigate(`/classes/${id}`);
  };

  const openEdit = (cls) => {
    setEditingClass(cls);
    form.setFieldsValue({
      name: cls.name,
      cameraUrl: cls.cameraUrl
    });
    setOpen(true);
  };

  return (
    <div>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Danh sách lớp học
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setOpen(true)}
        >
          Thêm lớp
        </Button>
      </Space>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          {classes.map((cls) => (
            <Col key={cls._id} xs={24} sm={12} lg={8}>
              <Card
                style={{ borderRadius: 10 }}
                title={cls?.name || "Chưa có thông tin"}
                extra={
                  <Dropdown
                    onClick={(e) => e.stopPropagation()}
                    menu={{
                      items: [
                        {
                          key: "edit",
                          label: (
                            <span onClick={() => openEdit(cls)}>
                              <EditOutlined /> Sửa lớp
                            </span>
                          )
                        },
                        {
                          key: "delete",
                          label: (
                            <Popconfirm
                              title="Xóa lớp này?"
                              okText="Xóa"
                              cancelText="Hủy"
                              onConfirm={() => handleDelete(cls._id)}
                            >
                              <span style={{ color: "red" }}>
                                <DeleteOutlined /> Xóa lớp
                              </span>
                            </Popconfirm>
                          )
                        }
                      ]
                    }}
                  >
                    <MoreOutlined onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                }
              >
                <Text type="secondary">
                  {cls?.studentCount || 0} sinh viên
                </Text>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToClass(cls._id);
                    }}
                  >
                    Vào lớp
                  </Button>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Modal
        open={open}
        title={editingClass ? "Sửa lớp học" : "Thêm lớp học"}
        okText={editingClass ? "Cập nhật" : "Tạo lớp"}
        onCancel={() => {
          setOpen(false);
          setEditingClass(null);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          <Form.Item
            name="name"
            label="Tên lớp"
            rules={[{ required: true, message: "Vui lòng nhập tên lớp" }]}
          >
            <Input placeholder="Nhập tên lớp học" />
          </Form.Item>

          <Form.Item
            name="cameraUrl"
            label="Camera URL"
            rules={[{ required: true, message: "Vui lòng nhập Camera url" }]}
          >
            <Input placeholder="VD: http://192.168.1.5:8080/video" />
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default ClassList;