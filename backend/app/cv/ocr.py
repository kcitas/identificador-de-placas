from dataclasses import dataclass
from functools import lru_cache

import numpy as np

ALLOWLIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


@dataclass
class OCRResult:
    text: str
    confidence: float  # 0-1


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
        return [OCRResult(text=text, confidence=round(float(conf), 3)) for _, text, conf in results]
