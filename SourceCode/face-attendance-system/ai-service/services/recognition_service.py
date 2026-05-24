import numpy as np
from core.face_embedding import get_embedding

THRESHOLD = 0.45

def cosine_similarity_matrix(matrix, vector):
    return np.dot(matrix, vector)

def recognize_face(frame, embeddings):
    emb = get_embedding(frame)

    if emb is None:
        return None, 0.0

    emb = np.array(
        emb,
        dtype=np.float32
    )

    embedding_matrix = np.array([
        item["embedding"]
        for item in embeddings
    ], dtype=np.float32)

    student_ids = [
        item["studentId"]
        for item in embeddings
    ]

    sims = cosine_similarity_matrix(
        embedding_matrix,
        emb
    )

    best_idx = np.argmax(sims)

    best_score = float(
        sims[best_idx]
    )

    best_match = student_ids[
        best_idx
    ]

    if best_score > THRESHOLD:
        return best_match, best_score

    return None, best_score
