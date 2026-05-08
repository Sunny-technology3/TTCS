import cv2

def augment_images(img):
    images = [img]

    # Flip ngang
    flip = cv2.flip(img, 1)
    images.append(flip)

    # Tăng sáng nhẹ
    bright = cv2.convertScaleAbs(img, alpha=1.1, beta=10)
    images.append(bright)

    # Xoay nhẹ
    h, w = img.shape[:2]
    center = (w // 2, h // 2)

    M = cv2.getRotationMatrix2D(center, 5, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h))
    images.append(rotated)

    return images