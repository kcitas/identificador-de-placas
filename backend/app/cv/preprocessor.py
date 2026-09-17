import cv2
import numpy as np

MAX_DIMENSION = 1600


class InvalidImageError(ValueError):
    pass


class ImagePreprocessor:
    """Decodes the upload and normalizes it for the detection stage."""

    def decode(self, data: bytes) -> np.ndarray:
        buffer = np.frombuffer(data, dtype=np.uint8)
        image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
        if image is None:
            raise InvalidImageError("El archivo no es una imagen válida.")
        return image

    def prepare(self, image: np.ndarray) -> np.ndarray:
        image = self._resize(image)
        return image

    def _resize(self, image: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        scale = MAX_DIMENSION / max(h, w)
        if scale < 1:
            image = cv2.resize(image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        return image

    def enhance_gray(self, image: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 11, 17, 17)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)
