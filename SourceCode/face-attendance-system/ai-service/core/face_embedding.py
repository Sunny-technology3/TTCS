import cv2
import numpy as np
import onnxruntime as ort
from utils.augment import augment_images

# ===== LOAD MODEL =====
session = ort.InferenceSession("models/arcface.onnx")
input_name = session.get_inputs()[0].name

# ===== FACE DETECTOR =====
face_cascade = cv2.CascadeClassifier(
    "models/haarcascade_frontalface_default.xml"
)

# ===== LANDMARK =====
facemark = cv2.face.createFacemarkLBF()
facemark.loadModel("models/lbfmodel.yaml")

# ===== TEMPLATE =====
arcface_dst = np.array([
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041]
], dtype=np.float32)

def align_face(img, landmarks):
    src = np.array(landmarks, dtype=np.float32)
    M, _ = cv2.estimateAffinePartial2D(src, arcface_dst)
    return cv2.warpAffine(img, M, (112, 112))

def preprocess(img):
    img = img.astype(np.float32)
    img = (img - 127.5) / 127.5
    img = np.transpose(img, (2, 0, 1))
    return np.expand_dims(img, axis=0)

def extract_embedding(image_bytes):
    img_array = np.frombuffer(
        image_bytes,
        np.uint8
    )

    img = cv2.imdecode(
        img_array,
        cv2.IMREAD_COLOR
    )

    augmented_images = augment_images(img)

    embeddings = []

    for aug_img in augmented_images:
        gray = cv2.cvtColor(aug_img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            raise Exception("No face detected")

        x, y, w, h = faces[0]

        ok, landmarks = facemark.fit(aug_img, np.array([(x, y, w, h)]))
        if not ok:
            continue

        pts = landmarks[0][0]

        five_points = [
            pts[36], pts[45], pts[30], pts[48], pts[54]
        ]

        aligned = align_face(aug_img, five_points)
        aligned = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)

        input_tensor = preprocess(aligned)
        embedding = session.run(None, {input_name: input_tensor})[0][0]

        embedding = embedding / np.linalg.norm(embedding)

        embeddings.append(embedding)

    if len(embeddings) == 0:
        raise Exception("No valid face embedding")

    final_embedding = np.mean(embeddings, axis=0)

    final_embedding = (
        final_embedding /
        np.linalg.norm(final_embedding)
    )

    return final_embedding.tolist()

def get_embedding(frame):
    img = frame.copy()

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) == 0:
        return None

    x, y, w, h = faces[0]

    ok, landmarks = facemark.fit(img, np.array([(x, y, w, h)]))
    if not ok:
        return None

    pts = landmarks[0][0]

    five_points = [
        pts[36], pts[45], pts[30], pts[48], pts[54]
    ]

    aligned = align_face(img, five_points)
    aligned = cv2.cvtColor(aligned, cv2.COLOR_BGR2RGB)

    input_tensor = preprocess(aligned)
    embedding = session.run(None, {input_name: input_tensor})[0][0]

    return embedding / np.linalg.norm(embedding)
