from dataclasses import dataclass
from functools import lru_cache

import numpy as np

ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


@dataclass
class LocalBBox:
    """Pixel box within the crop that was OCR'd — not yet translated to the
    original image's coordinates."""

    x: int
    y: int
    width: int
    height: int


@dataclass
class OCRResult:
    text: str
    confidence: float  # 0-1
    bbox: LocalBBox | None = None  # None for the empty-read sentinel


@lru_cache
def _get_reader():
    # Loaded once per process (model init is the expensive part) and reused
    # across requests — EasyOCR reads plate crops far more reliably than
    # Tesseract here (correctly tells J from O, handles the two-line
    # code+city layout on its own), at the cost of a heavier dependency
    # (torch) and slower per-image latency than Tesseract had.
    import easyocr

    return easyocr.Reader(["en"], gpu=False, verbose=False)

class OCRService:
    """Wraps EasyOCR. Isolated behind this class so the engine (e.g. AWS
    Textract/Rekognition) can be swapped later without touching the pipeline.
    """

    def read(self, image: np.ndarray) -> list[OCRResult]:
        """Returns every text block EasyOCR found in the crop (e.g. the plate
        code AND the city/country name below it, as separate blocks) — the
        caller picks the one that's actually plate-shaped rather than
        whichever had the highest raw confidence, since a clean dictionary
        word like "COLOMBIA" often reads more confidently than the code.
        """
        reader = _get_reader()
        results = reader.readtext(image, allowlist=ALLOWLIST)
        if not results:
            return [OCRResult(text="", confidence=0.0)]

        ocr_results = []
        for polygon, text, conf in results:
            xs = [p[0] for p in polygon]
            ys = [p[1] for p in polygon]
            bbox = LocalBBox(
                x=int(min(xs)), y=int(min(ys)), width=int(max(xs) - min(xs)), height=int(max(ys) - min(ys))
            )
            ocr_results.append(OCRResult(text=text, confidence=round(float(conf), 3), bbox=bbox))
        return ocr_results
