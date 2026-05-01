import cv2
import requests
import time
import numpy as np
from services.recognition_service import cosine_similarity
from core.face_embedding import get_embedding
from core.runtime_state import running_flags

THRESHOLD = 0.45

def run_realtime(class_id, camera_url):
    cap = cv2.VideoCapture(camera_url)

    if not cap.isOpened():
        print("Không thể mở camera:", camera_url)
        return

    last_checkin = {}
    checked_students = set()

    try:
        res = requests.get(
            f"http://localhost:8080/api/students/embeddings?classId={class_id}",
            timeout=5
        )
        embeddings = res.json()["data"]
    except Exception as e:
        print("Không tìm thấy embeddings của sinh viên:", e)
        return

    total_students = len(embeddings)
    print("Tổng số sinh viên:", total_students)

    try:
        while running_flags.get(class_id, False):
            ret, frame = cap.read()
            if not ret:
                continue

            try:
                emb = get_embedding(frame)
            except Exception as e:
                print("Embedding error:", e)
                continue

            if emb is None:
                continue

            best_match = None
            best_score = -1

            for item in embeddings:
                student_id = item["studentId"]

                if student_id in checked_students:
                    continue

                db_emb = np.array(item["embedding"])
                sim = cosine_similarity(emb, db_emb)

                if sim > best_score:
                    best_score = sim
                    best_match = student_id

            if best_score > THRESHOLD and best_match:
                now = time.time()

                if best_match not in last_checkin or now - last_checkin[best_match] > 5:
                    print("Recognized:", best_match)

                    try:
                        requests.post(
                            f"http://localhost:8080/api/attendances/auto-checkin?classId={class_id}",
                            json={"studentId": best_match},
                            timeout=3
                        )
                    except Exception as e:
                        print("Check-in API error:", e)

                    checked_students.add(best_match)
                    last_checkin[best_match] = now

            # Auto stop khi đủ
            if len(checked_students) == total_students:
                print("Tất cả sinh viên đã điểm danh")
                running_flags[class_id] = False
                break

            cv2.imshow(f"Realtime {class_id}", frame)

            if cv2.waitKey(1) == 27:
                running_flags[class_id] = False
                break

    except Exception as e:
        print("Realtime crashed:", e)

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print(f"Realtime stopped for class")
