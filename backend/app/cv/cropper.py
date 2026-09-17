import cv2
import numpy as np

from app.cv.detector import BBox

PADDING_FRACTION = 0.08
TARGET_HEIGHT = 320


class PlateCropper:
    """Crops the detected region, deskews it, and binarizes it for OCR."""

    def crop(self, image: np.ndarray, bbox: BBox) -> np.ndarray:
        h, w = image.shape[:2]
        pad_x = int(bbox.width * PADDING_FRACTION)
        pad_y = int(bbox.height * PADDING_FRACTION)
        x0 = max(bbox.x - pad_x, 0)
        y0 = max(bbox.y - pad_y, 0)
        x1 = min(bbox.x + bbox.width + pad_x, w)
        y1 = min(bbox.y + bbox.height + pad_y, h)
        return image[y0:y1, x0:x1]

    def deskew(self, crop: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
        coords = cv2.findNonZero(thresh)
        if coords is None or len(coords) < 10:
            return crop
        angle = cv2.minAreaRect(coords)[-1]
        angle = angle - 90 if angle > 45 else angle
        if abs(angle) < 1 or abs(angle) > 20:
            return crop  # not worth rotating / too unreliable an estimate
        h, w = crop.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(crop, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    def upscale_for_ocr(self, crop: np.ndarray) -> np.ndarray:
        """Upscales and sharpens a small crop before handing it to OCR — a
        plate that's a tiny part of a wide shot (a car far from the camera)
        is often too low-resolution for the text recognizer otherwise.
        """
        h, w = crop.shape[:2]
        if h >= TARGET_HEIGHT:
            return crop
        scale = TARGET_HEIGHT / h
        upscaled = cv2.resize(crop, (int(w * scale), TARGET_HEIGHT), interpolation=cv2.INTER_CUBIC)
        blurred = cv2.GaussianBlur(upscaled, (0, 0), 3)
        return cv2.addWeighted(upscaled, 1.5, blurred, -0.5, 0)
