import {
    Table,
    Button,
    Space,
    Tooltip,
    Modal,
    Form,
    Input,
    Upload,
    message,
    Popconfirm,
    Select,
    Avatar,
    Typography,
    Checkbox,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    UploadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import studentApi from '../../../api/studentApi';
import { normalizeText } from '../../../utils/string';

const { Text } = Typography;

function StudentTab({ students, classId, onStudentChange }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [data, setData] = useState(students);
    const [form] = Form.useForm();
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [searchType, setSearchType] = useState("studentId");
    const [searchText, setSearchText] = useState("");
    const [updateAvatar, setUpdateAvatar] = useState(false);

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
            updateAvatar: false,
        });

        setUpdateAvatar(false);
        setOpen(true);
    };

    const handleSubmit = async (values) => {
        setLoadingSubmit(true);

        try {
            const formData = new FormData();

            formData.append("fullName", values.fullName);
            formData.append("studentId", values.studentId);
            formData.append("classId", classId);

            const file = values.avatar?.fileList?.[0]?.originFileObj;

            if (file) {
                formData.append("file", file);
            }

            formData.append("updateAvatar", updateAvatar);

            let res;

            if (editing) {
                res = await studentApi.updateStudent(editing._id, formData);

                const updatedStudent = data.map((s) =>
                    s._id === editing._id ? res.data.data : s
                );

                setData(updatedStudent)
                onStudentChange?.(updatedStudent);

                message.success("Cập nhật sinh viên thành công");
            } else {
                res = await studentApi.createStudent(formData);

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

    const filteredData = (data || []).filter((student) => {
        const value = normalizeText(student?.[searchType] || "");
        const keyword = normalizeText(searchText);

        return value.includes(keyword);
    });

    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'avatarUrl',
            width: 80,
            align: 'center',
            render: (value, record) => (
                <Avatar
                    src={value}
                    alt={record.fullName}
                    size={42}
                />
            )
        },
        { title: 'Mã sinh viên', dataIndex: 'studentId' },
        { title: 'Họ và tên', dataIndex: 'fullName' },
        {
            title: 'Có mặt',
            dataIndex: ['stats', 'present'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'green', fontWeight: 'bold' }}>{value || 0}</span>
            )
        },
        {
            title: 'Đi muộn',
            dataIndex: ['stats', 'late'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'orange', fontWeight: 'bold' }}>{value || 0}</span>
            )
        },
        {
            title: 'Vắng mặt',
            dataIndex: ['stats', 'absent'],
            align: 'center',
            width: 100,
            render: (value) => (
                <span style={{ color: 'red', fontWeight: 'bold' }}>{value || 0}</span>
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
            <Space
                style={{
                    width: "100%",
                    justifyContent: "flex-end",
                    marginTop: 16,
                }}
            >
                <Space.Compact>
                    <Select
                        value={searchType}
                        onChange={setSearchType}
                        style={{ width: 130 }}
                        options={[
                            {
                                label: "Mã sinh viên",
                                value: "studentId",
                            },
                            {
                                label: "Họ và tên",
                                value: "fullName",
                            },
                        ]}
                    />

                    <Input
                        allowClear
                        placeholder={
                            searchType === "studentId"
                                ? "Nhập mã sinh viên..."
                                : "Nhập họ tên..."
                        }
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 260 }}
                    />
                </Space.Compact>

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Thêm sinh viên
                </Button>
            </Space>

            <Table
                style={{ marginTop: 16 }}
                dataSource={filteredData}
                columns={columns}
                rowKey="_id"
                locale={{
                    emptyText: searchText
                        ? "Không tìm thấy sinh viên phù hợp"
                        : "Chưa có sinh viên nào",
                }}
            />

            <Modal
                open={open}
                title={editing ? 'Sửa sinh viên' : 'Thêm sinh viên'}
                okText={editing ? "Cập nhật" : "Thêm sinh viên"}
                cancelText={"Hủy"}
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
                        <Form.Item
                            name="avatar"
                            label="Ảnh khuôn mặt"
                            valuePropName="fileList"
                            getValueFromEvent={(e) => e?.fileList}
                            rules={[{ required: true, message: 'Vui lòng upload ảnh khuôn mặt' }]}
                        >
                            <Upload
                                beforeUpload={() => false}
                                maxCount={1}
                                listType="picture"
                            >
                                <Button icon={<UploadOutlined />}>
                                    Chọn ảnh
                                </Button>
                            </Upload>

                            <Text
                                type="secondary"
                                style={{
                                    display: "block",
                                    marginTop: 8,
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                }}
                            >
                                Vui lòng sử dụng ảnh chân dung chính diện (từ cổ trở lên),
                                rõ nét, đủ sáng và không có nhiều người trong ảnh.
                            </Text>
                        </Form.Item>
                    )}

                    {editing && (
                        <>
                            <Form.Item
                                name="updateAvatar"
                                valuePropName="checked"
                            >
                                <Checkbox
                                    onChange={(e) => setUpdateAvatar(e.target.checked)}
                                >
                                    Cập nhật ảnh khuôn mặt
                                </Checkbox>
                            </Form.Item>

                            {updateAvatar && (
                                <Form.Item
                                    name="avatar"
                                    valuePropName="fileList"
                                    getValueFromEvent={(e) => e?.fileList}
                                >
                                    <Upload beforeUpload={() => false} maxCount={1}>
                                        <Button icon={<UploadOutlined />}>
                                            Upload ảnh mới
                                        </Button>
                                    </Upload>

                                    <Text
                                        type="secondary"
                                        style={{
                                            display: "block",
                                            marginTop: 8,
                                            fontSize: 12,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Vui lòng sử dụng ảnh chân dung chính diện (từ cổ trở lên),
                                        rõ nét, đủ sáng và không có nhiều người trong ảnh.
                                    </Text>
                                </Form.Item>
                            )}
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default StudentTab;