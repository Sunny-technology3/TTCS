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

    best_idx = np.argmax(sims)

    score = float(sims[best_idx])

    student_id = mongo_student_ids[best_idx]

    return {
        "matched": score >= threshold,
        "student_id": student_id,
        "score": score
    }
