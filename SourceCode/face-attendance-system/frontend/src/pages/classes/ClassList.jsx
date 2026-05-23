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
  Empty,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  EditOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import classApi from '../../api/classApi';
import useAllClass from '../../hooks/useAllClass';
import { useQueryClient } from "@tanstack/react-query";

const { Title, Text } = Typography;

function ClassList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingClass, setEditingClass] = useState(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");

  const {
    allClass: classes,
    loading,
  } = useAllClass(search);

  const handleSubmit = async (values) => {
    try {
      if (editingClass) {
        await classApi.updateClass(editingClass._id, values);

        message.success("Cập nhật lớp thành công");
      } else {
        await classApi.createClass(values);

        message.success("Tạo lớp thành công");
      }

      queryClient.invalidateQueries({
        queryKey: ["allClass"],
      });

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

      queryClient.invalidateQueries({
        queryKey: ["allClass"],
      });

      message.success("Xóa lớp học thành công");
    } catch (error) {
      console.log(error);
      message.error(error?.response?.data?.message || "Xóa lớp học thất bại");
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

        <Space>
          <Input
            placeholder="Tìm theo tên lớp"
            allowClear
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setOpen(true)}
          >
            Thêm lớp
          </Button>
        </Space>
      </Space>

      <Spin spinning={loading}>
        {
          classes.length === 0 ? (
            <Empty
              description={
                search
                  ? "Không tìm thấy lớp học phù hợp"
                  : "Chưa có lớp học nào"
              }
              style={{ marginTop: 40 }}
            />
          ) : (
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

                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "flex-end"
                      }}
                    >
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
          )
        }
      </Spin>

      <Modal
        open={open}
        title={editingClass ? "Sửa lớp học" : "Thêm lớp học"}
        okText={editingClass ? "Cập nhật" : "Tạo lớp"}
        cancelText={"Hủy"}
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