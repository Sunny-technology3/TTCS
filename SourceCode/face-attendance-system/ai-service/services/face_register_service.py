from core.face_embedding import extract_embedding

def register_face(file_bytes):
    embedding = extract_embedding(file_bytes)

    return {
        "embedding": embedding,
        "dim": len(embedding)
    }
