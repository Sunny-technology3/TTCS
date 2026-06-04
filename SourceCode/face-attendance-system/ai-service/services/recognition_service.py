import numpy as np
from core.face_embedding import get_embedding

THRESHOLD = 0.45

def cosine_similarity_matrix(matrix, vector):
    return np.dot(matrix, vector)

def recognize_face(
    face_crop,
    embedding_matrix,
    mongo_student_ids,
    threshold=0.45
):
    try:
        emb = get_embedding(face_crop)

    except Exception as e:
        print("Lỗi khi tạo embedding:", e)

        return {
            "matched": False,
            "student_id": None,
            "score": 0
        }

    if emb is None:
        return {
            "matched": False,
            "student_id": None,
            "score": 0
        }

    norm = np.linalg.norm(emb)

    if norm == 0:
        return {
            "matched": False,
            "student_id": None,
            "score": 0
        }

    emb = emb / norm

    sims = cosine_similarity_matrix(
        embedding_matrix,
        emb
    )

    scores = {}

    for idx, sim in enumerate(sims):
        student_id = mongo_student_ids[idx]

        if student_id not in scores:
            scores[student_id] = []

        scores[student_id].append(float(sim))

    best_student = None
    best_score = -1

    for student_id, student_scores in scores.items():
        score = np.mean(
            sorted(student_scores, reverse=True)[:3]
        )

        if score > best_score:
            best_score = score
            best_student = student_id

    return {
        "matched": best_score >= threshold,
        "student_id": best_student,
        "score": best_score
    }
