import cv2
import requests
import time
import numpy as np
from datetime import datetime, timezone

from services.recognition_service import cosine_similarity
from core.face_embedding import get_embedding
from core.runtime_state import running_flags

THRESHOLD = 0.45

face_detector = cv2.FaceDetectorYN.create(
    "models/face_detection_yunet_2023mar.onnx",
    "",
    (320, 320)
)

def get_checked_students(class_id, session_id, token):
    try:
        res = requests.get(
            "http://localhost:8080/api/attendances/session",
            params={
                "classId": class_id,
                "sessionId": session_id
            },
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )

        rows = res.json()["data"]

        checked_students = set()

        student_map = {}

        for item in rows:

            student_map[item["_id"]] = item["studentId"]

            if item["status"] != "absent":
                checked_students.add(item["_id"])

        return checked_students, student_map
    
    except Exception as e:
        print("Lỗi khi lấy dữ liệu điểm dang:", e)

        return set(), {}
    
def generate_realtime_frames(class_id, session_id, camera_url, end_time, token):
    # Mở camera
    cap = cv2.VideoCapture(camera_url)

    if not cap.isOpened():
        print("Không thể mở camera:", camera_url)
        return

    last_check_in = {}

    checked_students, student_map = get_checked_students(
        class_id,
        session_id,
        token
    )

    try:
        # Lấy embedding của sinh viên
        res = requests.get(
            f"http://localhost:8080/api/students/embeddings?classId={class_id}",
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )

        embeddings = res.json()["data"]

    except Exception as e:
        print("Không tìm thấy embeddings của sinh viên:", e)
        return

    total_students = len(embeddings)

    print("Tổng số sinh viên:", total_students)

    end_dt = datetime.fromisoformat(
        end_time.replace("Z", "+00:00")
    )

    try:
        while running_flags.get(class_id, True):
            # Auto stop khi hết giờ
            now = datetime.now(timezone.utc)

            if now >= end_dt:
                print("Phiên học đã hết thời gian")

                try:
                    requests.put(
                        f"http://localhost:8080/api/sessions/{session_id}/status",
                        json={
                            "status": "finished"
                        },
                        headers={
                            "Authorization": f"Bearer {token}"
                        },
                        timeout=5
                    )
                except Exception as e:
                    print("Lỗi auto finish:", e)

                running_flags[class_id] = False
                break

            ret, frame = cap.read()

            if not ret:
                continue

            h, w = frame.shape[:2]

            # update size cho YuNet
            face_detector.setInputSize((w, h))

            best_match = None
            best_score = -1

            # detect face
            _, faces = face_detector.detect(frame)

            if faces is not None:
                for face in faces:
                    # Crop khuôn mặt
                    x, y, fw, fh = face[:4].astype(int)

                    confidence = face[-1]

                    if confidence < 0.8:
                        continue

                    if fw < 60 or fh < 60:
                        continue

                    x = max(0, x)
                    y = max(0, y)

                    fw = min(fw, w - x)
                    fh = min(fh, h - y)

                    face_crop = frame[y:y+fh, x:x+fw]

                    try:
                        emb = get_embedding(face_crop)

                    except Exception as e:
                        print("Lỗi khi tạo embedding:", e)
                        continue

                    if emb is None:
                        continue

                    current_best_match = None
                    current_best_score = -1

                    for item in embeddings:
                        mongo_student_id = item["studentId"]

                        db_emb = np.array(item["embedding"])

                        sim = cosine_similarity(emb, db_emb)

                        if sim > current_best_score:
                            current_best_score = sim
                            current_best_match = mongo_student_id

                    is_match = current_best_score > THRESHOLD

                    color = (
                        (0, 255, 0)
                        if is_match
                        else (0, 0, 255)
                    )

                    display_student = (
                        student_map.get(current_best_match)
                        if current_best_match
                        else "Unknown"
                    )

                    # Vẽ khung mặt
                    cv2.rectangle(
                        frame,
                        (x, y),
                        (x + fw, y + fh),
                        color,
                        2
                    )

                    label = (
                        f"{display_student} - CHECKED"
                        if current_best_match in checked_students
                        else f"{display_student} ({current_best_score:.2f})"
                    )
                    # Label phía trên mặt
                    cv2.putText(
                        frame,
                        label,
                        (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        color,
                        2
                    )

                    # Lưu best global
                    if current_best_score > best_score:
                        best_score = current_best_score
                        best_match = current_best_match

            # Tự động check-in
            if best_score > THRESHOLD and best_match and best_match not in checked_students:
                now = time.time()

                # Chặn spam check-in
                if (
                    best_match not in last_check_in
                    or now - last_check_in[best_match] > 5
                ):

                    print(
                        "Đã nhận diện:",
                        student_map.get(best_match, best_match)
                    )

                    try:
                        requests.post(
                            f"http://localhost:8080/api/attendances/auto-check-in?classId={class_id}",
                            json={
                                "studentId": best_match
                            },
                            headers={
                                "Authorization": f"Bearer {token}"
                            },
                            timeout=3
                        )
                    except Exception as e:
                        print("Lỗi gọi api check-in:", e)

                    checked_students.add(best_match)

                    last_check_in[best_match] = now

            # Hiện giao diện
            is_match = best_score > THRESHOLD

            overlay_color = (
                (0, 255, 0)
                if is_match
                else (0, 0, 255)
            )

            label = (
                "MATCH"
                if is_match
                else "NO MATCH"
            )

            # Khung nền
            cv2.rectangle(
                frame,
                (10, 10),
                (450, 220),
                (20, 20, 20),
                -1
            )

            display_student = (
                student_map.get(best_match)
                if best_match
                else "Unknown"
            )

            cv2.putText(
                frame,
                f"Student: {display_student}",
                (20, 45),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2
            )

            cv2.putText(
                frame,
                f"Similarity: {best_score:.3f}",
                (20, 85),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                overlay_color,
                2
            )

            cv2.putText(
                frame,
                f"Threshold: {THRESHOLD}",
                (20, 125),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 255),
                2
            )

            # Hiển thị trạng thái
            cv2.putText(
                frame,
                label,
                (20, 170),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                overlay_color,
                3
            )

            # Hiển thị thanh similarity
            bar_x = 220
            bar_y = 105

            bar_width = 180
            bar_height = 16

            cv2.rectangle(
                frame,
                (bar_x, bar_y),
                (bar_x + bar_width, bar_y + bar_height),
                (80, 80, 80),
                -1
            )

            # Độ dài thanh similarity
            fill_width = int(
                bar_width * min(max(best_score, 0), 1)
            )

            # Vẽ thanh similarity
            cv2.rectangle(
                frame,
                (bar_x, bar_y),
                (bar_x + fill_width, bar_y + bar_height),
                overlay_color,
                -1
            )

            # Vẽ vạch threshold
            threshold_x = int(
                bar_x + THRESHOLD * bar_width
            )

            cv2.line(
                frame,
                (threshold_x, bar_y - 5),
                (threshold_x, bar_y + bar_height + 5),
                (255, 255, 255),
                2
            )

            # Thống kê
            cv2.putText(
                frame,
                f"Checked: {len(checked_students)}/{total_students}",
                (20, 210),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2
            )

            # Tự động dừng khi đủ sinh viên
            # if len(checked_students) == total_students:
            #     print("Tất cả sinh viên đã điểm danh")

            #     running_flags[class_id] = False

            if len(checked_students) == total_students:
                cv2.putText(
                    frame,
                    "Da diem danh day du",
                    (20, 250),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    3
                )

            # STREAM FRAME sang React
            _, buffer = cv2.imencode(".jpg", frame)

            frame_bytes = buffer.tobytes()

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n'
                + frame_bytes +
                b'\r\n'
            )

    except Exception as e:
        print("Realtime bị lỗi:", e)

    finally:
        cap.release()

        print(f"Đã dừng realtime")