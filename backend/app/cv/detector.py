from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

# Pretrained YOLOv8 license-plate detector (single class: "license_plate"),
# downloaded once from the Hub and cached on disk — same lazy-singleton
# pattern as EasyOCR in ocr.py. MIT-licensed: https://huggingface.co/Koushim/yolov8-license-plate-detection
MODEL_REPO_ID = "Koushim/yolov8-license-plate-detection"
MODEL_FILENAME = "best.pt"
WEIGHTS_DIR = Path(__file__).parent / "weights"
CONFIDENCE_THRESHOLD = 0.2  # kept low: the OCR stage re-ranks candidates, so a wide net is fine here


@dataclass
class BBox:
    x: int
    y: int
    width: int
    height: int

    def as_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "width": self.width, "height": self.height}


@dataclass
class Detection:
    bbox: BBox
    score: float  # 0-1 YOLO detection confidence, not OCR confidence


@lru_cache
def _get_model():
    from huggingface_hub import hf_hub_download
    from ultralytics import YOLO

    weights_path = WEIGHTS_DIR / MODEL_FILENAME
    if not weights_path.exists():
        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        hf_hub_download(repo_id=MODEL_REPO_ID, filename=MODEL_FILENAME, local_dir=str(WEIGHTS_DIR))

    return YOLO(str(weights_path))


class PlateDetector:
    """Locates candidate plate regions with a pretrained YOLOv8 model.

    Geometry/confidence alone can't tell a plate apart from a similarly-shaped
    region nearby (e.g. a car's grille around the plate) — it returns several
    ranked candidates and leaves picking the one that actually reads as a
    plate to the OCR stage (see PlateRecognitionService).
    """

    def detect_candidates(self, image_bgr: np.ndarray, gray: np.ndarray, top_k: int = 5) -> list[Detection]:
        model = _get_model()
        results = model.predict(image_bgr, conf=CONFIDENCE_THRESHOLD, verbose=False)[0]

        candidates = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            candidates.append(
                Detection(
                    bbox=BBox(x=int(x1), y=int(y1), width=int(x2 - x1), height=int(y2 - y1)),
                    score=round(float(box.conf[0]), 3),
                )
            )

        candidates.sort(key=lambda d: d.score, reverse=True)
        return candidates[:top_k]
