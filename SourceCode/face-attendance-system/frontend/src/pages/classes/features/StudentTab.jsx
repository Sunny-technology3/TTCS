import { Table, Button, Space, Tooltip, Modal, Form, Input, Upload, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import studentApi from '../../../api/studentApi';

function StudentTab({ students, classId, onStudentChange }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [data, setData] = useState(students);
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);

    const openAdd = () => {
        setEditing(null);
        form.resetFields();
        setOpen(true);
    };

    const openEdit = (record) => {
        setEditing(record);
        form.setFieldsValue({
            fullName: record.fullName,
            studentId: record.studentId,
        });
        setOpen(true);
    };

    const handleSubmit = async (values) => {
        setLoadingSubmit(true);

        try {
            const formData = new FormData();

            formData.append("fullName", values.fullName);
            formData.append("studentId", values.studentId);

            formData.append("classId", classId);

            const fileObj = values.avatar?.file;

            if (fileObj) {
                formData.append("file", fileObj.originFileObj || fileObj);
            }

            if (editing) {
                const res = await studentApi.updateStudent(editing._id, formData);

                const updatedStudent = data.map((s) =>
                    s._id === editing._id ? res.data.data : s
                );

                setData(updatedStudent)
                onStudentChange?.(updatedStudent);

                message.success("Cập nhật sinh viên thành công");
            } else {
                const res = await studentApi.createStudent(formData);

                const newStudent = [...data, res.data.data];

                setData(newStudent);
                onStudentChange?.(newStudent);

                message.success("Thêm sinh viên thành công");
            }

            setOpen(false);
            form.resetFields();
            setEditing(null);
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await studentApi.deleteStudent(id);

            const newData = data.filter((item) => item._id !== id);

            setData(newData);
            onStudentChange?.(newData);

            message.success("Xóa thành công");
        } catch (error) {
            console.log(error);
            message.error(error?.response?.data?.message || "Xóa thất bại");
        }
    };

    const columns = [
        { title: 'Mã sinh viên', dataIndex: 'studentId' },
        { title: 'Họ và tên', dataIndex: 'fullName' },
        {
            title: 'Có mặt',
            dataIndex: ['stats', 'present'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'green', fontWeight: 'bold' }}>{value}</span>
            )
        },
        {
            title: 'Đi muộn',
            dataIndex: ['stats', 'late'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'orange', fontWeight: 'bold' }}>{value}</span>
            )
        },
        {
            title: 'Vắng mặt',
            dataIndex: ['stats', 'absent'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'red', fontWeight: 'bold' }}>{value}</span>
            )
        },
        {
            title: 'Thao tác',
            align: 'left',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>

                    <Popconfirm
                        title="Xóa sinh viên?"
                        onConfirm={() => handleDelete(record._id)}
                    >
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                Thêm sinh viên
            </Button>

            <Table
                style={{ marginTop: 16 }}
                dataSource={data}
                columns={columns}
                rowKey="id"
            />

            <Modal
                open={open}
                title={editing ? 'Sửa sinh viên' : 'Thêm sinh viên'}
                onCancel={() => setOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={loadingSubmit}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="studentId"
                        label="Mã sinh viên"
                        rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên' }]}
                    >
                        <Input placeholder="Nhập mã sinh viên" />
                    </Form.Item>

                    <Form.Item
                        name="fullName"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                    >
                        <Input placeholder="Nhập họ và tên sinh viên" />
                    </Form.Item>

                    {!editing && (
                        <Form.Item name="avatar" label="Ảnh">
                            <Upload beforeUpload={() => false} listType="picture">
                                <Button icon={<UploadOutlined />}>
                                    Upload ảnh
                                </Button>
                            </Upload>
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default StudentTab;