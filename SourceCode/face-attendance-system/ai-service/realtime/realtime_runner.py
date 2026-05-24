import os
import cv2
import requests
import time
import numpy as np

from datetime import datetime, timezone
from deep_sort_realtime.deepsort_tracker import DeepSort

from services.recognition_service import recognize_face
from core.runtime_state import running_flags

THRESHOLD = 0.45

BACKEND_URL = os.getenv(
    "BACKEND_URL",
    "http://localhost:8080"
)

http = requests.Session()

# Detect mỗi N frame để giảm tải
PROCESS_EVERY_N_FRAMES = 5

# Số frame liên tiếp để xác nhận track
MIN_TRACK_AGE = 3

# Cooldown check-in
CHECKIN_COOLDOWN = 10

# Refresh trạng thái điểm danh
SYNC_INTERVAL = 10

# Retry recognize cho track chưa match
RECOGNIZE_INTERVAL = 2

# Re-recognize định kỳ để tránh tracker drift
TRACK_RECHECK_INTERVAL = 5

face_detector = cv2.FaceDetectorYN.create(
    "models/face_detection_yunet_2023mar.onnx",
    "",
    (320, 320)
)

def get_checked_students(class_id, session_id, token):
    try:
        res = http.get(
            f"{BACKEND_URL}/api/attendances/session",
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

        checked_student_ids = set()

        for item in rows:
            if item["status"] != "absent":
                checked_student_ids.add(
                    item["studentId"]
                )

        return checked_student_ids

    except Exception as e:
        print("Lỗi khi lấy dữ liệu điểm danh:", e)

        return set()

def auto_finish_session(session_id, class_id, token):
    try:
        http.put(
            f"{BACKEND_URL}/api/sessions/{session_id}/status",
            json={
                "status": "finished"
            },
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )

    except Exception as e:
        print("Lỗi khi kết thúc phiên học:", e)

    finally:
        running_flags[class_id] = False

def generate_realtime_frames(class_id, session_id, camera_url, end_time, token):
    # Mở camera
    cap = cv2.VideoCapture(camera_url)

    if not cap.isOpened():
        print("Không thể mở camera:", camera_url)
        time.sleep(5)
        return

    try:
        # Lấy embedding của sinh viên
        res = http.get(
            f"{BACKEND_URL}/api/students/embeddings",
            params={
                "classId": class_id
            },
            headers={
                "Authorization": f"Bearer {token}"
            },
            timeout=5
        )

        embeddings = res.json()["data"]

    except Exception as e:
        print("Không tìm thấy embeddings của sinh viên:", e)
        return

    if len(embeddings) == 0:
        print("Không có embeddings")
        return
    
    total_students = len(embeddings)

    print("Tổng số sinh viên:", total_students)

    checked_student_ids = get_checked_students(
        class_id,
        session_id,
        token
    )

    # Matrix embeddings
    embedding_matrix = np.array([
        item["embedding"]
        for item in embeddings
    ], dtype=np.float32)

    matrix_norms = np.linalg.norm(
        embedding_matrix,
        axis=1,
        keepdims=True
    )

    matrix_norms[matrix_norms == 0] = 1

    embedding_matrix = embedding_matrix / matrix_norms

    mongo_student_ids = [
        item["_id"]
        for item in embeddings
    ]

    # Label hiển thị
    student_labels = {
        item["_id"]: item["studentId"]
        for item in embeddings
    }

    end_dt = datetime.fromisoformat(
        end_time.replace("Z", "+00:00")
    )

    frame_count = 0

    last_check_in = {}

    last_sync = time.time()

    prev_time = time.time()

    fail_count = 0

    fps = 0

    last_best_match = None
    last_best_score = -1
    last_detect_time = 0

    # update size cho YuNet
    face_detector.setInputSize((640, 360))
    
    # Khởi tạo tracker
    tracker = DeepSort(
        max_age=15,
        n_init=2,
        max_cosine_distance=0.3
    )

    track_id_to_student = {}
    track_id_to_score = {}

    # Lưu thời điểm recognize gần nhất của track
    track_id_last_recognize = {}

    # Lưu thời điểm verify danh tính gần nhất
    track_id_last_verified = {}
    
    try:
        while running_flags.get(class_id, True):
            # Auto stop khi hết giờ
            now = datetime.now(timezone.utc)

            if now >= end_dt:
                print("Phiên học đã hết thời gian")

                auto_finish_session(
                    session_id,
                    class_id,
                    token
                )

                break

            # REFRESH trạng thái điểm danh
            if time.time() - last_sync > SYNC_INTERVAL:
                checked_student_ids = get_checked_students(
                    class_id,
                    session_id,
                    token
                )

                # Cleanup cache check-in cũ
                last_check_in = {
                    k: v
                    for k, v in last_check_in.items()
                    if time.time() - v < 3600
                }

                last_sync = time.time()

            ret, frame = cap.read()

            if not ret:
                fail_count += 1

                print("Không đọc được frame")

                # Kết nối lại camera
                if fail_count > 30:
                    print("Đang reconnect camera...")

                    cap.release()

                    time.sleep(2)

                    cap = cv2.VideoCapture(camera_url)

                    fail_count = 0

                continue

            fail_count = 0

            frame_count += 1

            h, w = frame.shape[:2]

            # FPS
            current_time = time.time()

            delta = current_time - prev_time

            instant_fps = 1 / delta if delta > 0 else 0

            fps = 0.9 * fps + 0.1 * instant_fps

            prev_time = current_time

            scale_x = w / 640
            scale_y = h / 360

            current_best_match = None
            current_best_score = -1

            if frame_count % PROCESS_EVERY_N_FRAMES == 0:
                # Resize frame
                resized_frame = cv2.resize(
                    frame,
                    (640, 360)
                )

                # detect face
                _, faces = face_detector.detect(resized_frame)

                detections = []

                if faces is not None:
                    for face in faces:
                        # Crop khuôn mặt
                        x, y, fw, fh = face[:4].astype(int)

                        confidence = face[-1]

                        if confidence < 0.8:
                            continue

                        # Scale về frame gốc
                        x = int(x * scale_x)
                        y = int(y * scale_y)

                        fw = int(fw * scale_x)
                        fh = int(fh * scale_y)

                        if fw < 60 or fh < 60:
                            continue

                        x = max(0, x)
                        y = max(0, y)

                        fw = min(fw, w - x)
                        fh = min(fh, h - y)

                        detections.append(
                            (
                                [x, y, fw, fh],
                                confidence,
                                "face"
                            )
                        )

                tracks = tracker.update_tracks(
                    detections,
                    frame=frame
                )

                if faces is not None and len(faces) > 0:
                    last_detect_time = time.time()

                active_track_ids = set()

                for track in tracks:
                    if track.is_confirmed():
                        active_track_ids.add(track.track_id)

                track_id_to_student = {
                    k: v
                    for k, v in track_id_to_student.items()
                    if k in active_track_ids
                }

                track_id_to_score = {
                    k: v
                    for k, v in track_id_to_score.items()
                    if k in active_track_ids
                }

                track_id_last_recognize = {
                    k: v
                    for k, v in track_id_last_recognize.items()
                    if k in active_track_ids
                }

                track_id_last_verified = {
                    k: v
                    for k, v in track_id_last_verified.items()
                    if k in active_track_ids
                }

                for track in tracks:
                    if not track.is_confirmed():
                        continue

                    track_id = track.track_id

                    ltrb = track.to_ltrb()

                    x1, y1, x2, y2 = map(int, ltrb)

                    fw = x2 - x1
                    fh = y2 - y1

                    if fw <= 0 or fh <= 0:
                        continue

                    x1 = max(0, x1)
                    y1 = max(0, y1)

                    x2 = min(w, x2)
                    y2 = min(h, y2)

                    face_crop = frame[y1:y2, x1:x2]

                    if face_crop.size == 0:
                        continue

                    # Chỉ recognize track mới
                    should_recognize = (
                        (
                            track_id not in track_id_to_student
                            or time.time() - track_id_last_verified.get(
                                track_id,
                                0
                            ) > TRACK_RECHECK_INTERVAL
                        )
                        and (
                            track_id not in track_id_last_recognize
                            or time.time() - track_id_last_recognize[track_id]
                            > RECOGNIZE_INTERVAL
                        )
                    )

                    if should_recognize and track.hits >= MIN_TRACK_AGE:
                        track_id_last_recognize[track_id] = time.time()

                        result = recognize_face(
                            face_crop=face_crop,
                            embedding_matrix=embedding_matrix,
                            mongo_student_ids=mongo_student_ids,
                            threshold=THRESHOLD
                        )

                        if result and result.get("matched"):
                            student_id = result["student_id"]

                            track_id_to_student[track_id] = student_id

                            track_id_to_score[track_id] = result["score"]

                            track_id_last_verified[track_id] = time.time()

                        else:
                            track_id_to_student.pop(track_id, None)
                            track_id_to_score.pop(track_id, None)

                    student_id = track_id_to_student.get(track_id)

                    score = track_id_to_score.get(track_id, 0)

                    if student_id is None:
                        continue

                    if score >= THRESHOLD and score > current_best_score:
                        current_best_score = score
                        current_best_match = student_id

                    display_student = student_labels.get(
                        student_id,
                        "Unknown"
                    )

                    color = (0, 255, 0)

                    cv2.rectangle(
                        frame,
                        (x1, y1),
                        (x2, y2),
                        color,
                        2
                    )

                    label = f"{display_student} ({score:.2f})"

                    if student_id in checked_student_ids:
                        label += " - CHECKED"

                    cv2.putText(
                        frame,
                        label,
                        (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        color,
                        2
                    )

                    # Auto check-in
                    if (
                        track.hits >= MIN_TRACK_AGE
                        and student_id not in checked_student_ids
                    ):
                        now_ts = time.time()

                        if (
                            student_id not in last_check_in
                            or now_ts - last_check_in[student_id]
                            > CHECKIN_COOLDOWN
                        ):

                            print("Đã nhận diện:", display_student)

                            try:
                                response = http.post(
                                    f"{BACKEND_URL}/api/attendances/auto-check-in",
                                    params={
                                        "classId": class_id
                                    },
                                    json={
                                        "studentId": student_id
                                    },
                                    headers={
                                        "Authorization": f"Bearer {token}"
                                    },
                                    timeout=3
                                )

                                if response.ok:
                                    checked_student_ids.add(student_id)

                                    last_check_in[student_id] = now_ts

                            except Exception as e:
                                print("Check-in error:", e)

                last_best_match = current_best_match
                last_best_score = current_best_score
            
            # Reset overlay nếu lâu không detect
            if time.time() - last_detect_time > 2:
                last_best_match = None
                last_best_score = -1

            # Hiện giao diện
            overlay_color = (
                (0, 255, 0)
                if last_best_score >= THRESHOLD
                else (0, 0, 255)
            )

            display_student = (
                student_labels.get(last_best_match)
                if last_best_match
                else "Unknown"
            )

            label = (
                "MATCH"
                if last_best_score >= THRESHOLD
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
                f"Similarity: {last_best_score:.3f}",
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
                bar_width * min(max(last_best_score, 0), 1)
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
                f"Checked: {len(checked_student_ids)}/{total_students}",
                (20, 210),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 255),
                2
            )

            # Tự động dừng khi đủ sinh viên
            # if len(checked_student_ids) == total_students:
            #     print("Tất cả sinh viên đã điểm danh")

            #     running_flags[class_id] = False

            if len(checked_student_ids) == total_students:
                cv2.putText(
                    frame,
                    "Da diem danh day du",
                    (20, 250),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    3
                )

            # FPS
            cv2.putText(
                frame,
                f"FPS: {fps:.1f}",
                (20, 290),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2
            )

            # STREAM FRAME sang React
            success, buffer = cv2.imencode(
                ".jpg",
                frame
            )

            if not success:
                continue

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