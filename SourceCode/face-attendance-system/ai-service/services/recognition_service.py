import numpy as np
from core.face_embedding import get_embedding

THRESHOLD = 0.45

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def recognize_face(frame, embeddings):
    emb = get_embedding(frame)

    best_match = None
    best_score = -1

    for item in embeddings:
        db_emb = np.array(item["embedding"])
        student_id = item["studentId"]

        sim = cosine_similarity(emb, db_emb)

        if sim > best_score:
            best_score = sim
            best_match = student_id

    if best_score > THRESHOLD:
        return best_match, float(best_score)

    return None, float(best_score)
