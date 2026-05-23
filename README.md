# Face Attendance System

Hệ thống điểm danh sinh viên sử dụng công nghệ nhận diện khuôn mặt thời gian thực (Realtime Face Recognition) nhằm hỗ trợ tự động hóa quá trình điểm danh trong lớp học.

---

## Công nghệ sử dụng

* Frontend: ReactJS + Ant Design
* Backend: Node.js + Express + MongoDB
* AI Service: Python + FastAPI + ONNX (ArcFace)
* Cloud Storage: Cloudflare R2

---

## Kiến trúc hệ thống

Hệ thống được chia thành 3 thành phần chính:

- Frontend: Giao diện quản lý và realtime monitoring
- Backend: Xử lý API, xác thực và quản lý dữ liệu
- AI Service: Xử lý nhận diện khuôn mặt và realtime face recognition

---

## Cấu trúc dự án

```
face-attendance-system/
│── frontend/        # React UI
│── backend/         # NodeJS API + MongoDB
│── ai-service/      # Python AI service
│── package.json     # Chạy FE + BE cùng lúc
│── README.md
```

---

## Clone project

```bash
git clone https://github.com/Sunny-technology3/TTCS.git
cd SourceCode/face-attendance-system
```

---

## Yêu cầu hệ thống

* Node.js >= 18 (đã test với Node.js 22)
* Python >= 3.10 (đã test với Python 3.12)

---

## Database

Project đã được cấu hình sẵn MongoDB Atlas (cloud).

Không cần cài MongoDB hoặc cấu hình thêm.

Chỉ cần chạy project là sử dụng được ngay.

---

## Cloud Storage

Hệ thống sử dụng Cloudflare R2 để lưu trữ ảnh sinh viên và dữ liệu upload.

Các file sau khi upload sẽ được truy cập thông qua public URL.

---

## Cài đặt & chạy hệ thống

---

## 1. Cài đặt toàn bộ (Frontend + Backend + Ai-Service)

### Bước 1: Cài dependencies ở thư mục gốc
```bash
npm install
```
### Bước 2: Cài cho Frontend
```bash
cd frontend
npm install
cd ..
```
### Bước 3: Cài cho Backend
```bash
cd backend
npm install
cd ..
```
### Bước 4: Cài cho Ai-service
```bash
cd ai-service

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
```
### Bước 5: Download AI Models
Do giới hạn của GitHub, các file model KHÔNG được commit vào repo.

Vui lòng tải các file sau và đặt vào thư mục: ai-service/models/

---

#### 1. ArcFace (Embedding model)

Model sử dụng: ArcFace (ResNet-50, 512-dim)

* Truy cập:
https://github.com/deepinsight/insightface/releases

* Tải file: `buffalo_l.zip`

* Giải nén, lấy file: `w600k_r50.onnx`

* Đổi tên thành: `arcface.onnx`

---

#### 2. YuNet (Face Detection)

Model sử dụng để phát hiện khuôn mặt realtime.

* Truy cập:
https://github.com/opencv/opencv_zoo/blob/main/models/face_detection_yunet

* Tải file: `face_detection_yunet_2023mar.onnx`

---

#### 3. Landmark model (Face alignment)

* Truy cập:
https://github.com/kurnianggoro/GSOC2017/tree/master/data

* Tải file: `lbfmodel.yaml`

---
#### Lưu ý: Phải thực hiện đầy đủ các bước trên để tránh lỗi khi chạy

#### Sau khi hoàn tất, cấu trúc thư mục như sau:

```
ai-service/
│
├── models/
│ ├── arcface.onnx
│ ├── face_detection_yunet_2023mar.onnx
│ └── lbfmodel.yaml
```

---

### Cấu hình Backend (.env)

Tạo file `.env` trong thư mục `backend`:

```env

DB_URL=

secretKey=

R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_URL=

```

---

### Cấu hình Camera (Realtime)

Sử dụng điện thoại làm camera:

1. Cài app **IP Webcam** (Android)
2. Mở app → chọn **Start Server**
3. Lấy URL dạng:

```
http://x.x.x.x:8080/video
```

4. Lưu URL này vào hệ thống (cameraUrl của lớp học)

#### Điều kiện:

* Điện thoại và máy tính cùng WiFi
* Truy cập URL trên máy tính phải xem được video

---

## 2. Chạy Frontend + Backend cùng lúc

### Quan trọng: Chạy lệnh này tại thư mục gốc (face-attendance-system)
```bash
npm run dev
```

Sau khi chạy:

* Frontend: http://localhost:3000
* Backend: http://localhost:8080

---

## 3. Chạy AI Service (chạy riêng)

```bash
cd ai-service
venv\Scripts\activate
```

Chạy AI service:

```bash
uvicorn main:app --reload --port 8000
```

* AI service: http://localhost:8000

---

## Chức năng chính

### Giảng viên

- Đăng nhập hệ thống
- Quản lý lớp học
- Quản lý sinh viên
- Import danh sách sinh viên từ Excel
- Upload ảnh sinh viên
- Tạo phiên học
- Điểm danh realtime bằng camera
- Xuất file Excel điểm danh

### AI Realtime

- Phát hiện khuôn mặt realtime
- Sinh embedding bằng ArcFace
- So khớp cosine similarity
- Tự động check-in sinh viên

---

## Quy trình sử dụng

1. Tạo lớp học
2. Thêm sinh viên + upload ảnh (tạo embedding)
3. Cấu hình camera URL
4. Tạo phiên học (session)
5. Nhấn **Bắt đầu** => hệ thống chạy AI realtime
6. Nhấn **Kết thúc** để dừng

---

## Quy trình nhận diện khuôn mặt

1. Camera gửi frame realtime
2. YuNet phát hiện khuôn mặt
3. Face Alignment chuẩn hóa khuôn mặt
4. ArcFace sinh vector embedding 512 chiều
5. So sánh cosine similarity với dữ liệu đã lưu
6. Nếu độ tương đồng vượt ngưỡng -> tự động điểm danh

---

## Tài khoản dùng thử

Hệ thống đã cung cấp sẵn tài khoản giảng viên để phục vụ việc kiểm thử nhanh các chức năng.

### Thông tin đăng nhập

```txt
Tài khoản: GV001
Mật khẩu: 12345678
```

Sau khi đăng nhập, người dùng có thể trải nghiệm các chức năng chính:

* Quản lý lớp học
* Quản lý sinh viên
* Tạo và quản lý phiên học
* Điểm danh realtime bằng nhận diện khuôn mặt
* Xuất file điểm danh Excel

Lưu ý: Đây là tài khoản phục vụ mục đích demo và kiểm thử hệ thống.

---

## API chính

### Backend API

* `GET /api/students/embeddings`
* `POST /api/attendances/auto-checkin`
* `PUT /api/sessions/:sessionId/status`

### AI Service API

* `POST /api/face/register`
* `POST /api/attendance/start`
* `POST /api/attendance/stop`

---

## Lưu ý quan trọng

* Phải chạy AI service trước khi bắt đầu session
* Camera URL phải hoạt động
* Không commit:

  * `node_modules`
  * `venv`
  * `.env`
  * `__pycache__/`
  * `ai-service/models/`
---

## Tác giả

* Name: Lê Minh Nam
* Project: Face Attendance System
