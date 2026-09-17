from dataclasses import dataclass

import cv2
import numpy as np

IDEAL_ASPECT_RATIO = 3.14  # typical plate width:height (e.g. many Latin American plates)
MIN_ASPECT_RATIO = 1.8
MAX_ASPECT_RATIO = 6.0
MIN_AREA_FRACTION = 0.004
MAX_AREA_FRACTION = 0.35
COLOR_MAX_AREA_FRACTION = 0.12  # a plate is a small feature of the frame — cap tighter than generic edges
CANDIDATES_TO_SCAN = 20
COLOR_CANDIDATE_BONUS = 0.3  # a plate-colored blob is a much stronger signal than edges alone
COMPACTNESS_WEIGHT = 0.2  # among valid boxes, prefer the smaller/tighter one — plates are small features

# Many plates are printed on a solid, saturated background (yellow in Colombia
# and elsewhere, white/light in many others) that stands out from the car body —
# a much cleaner signal than generic edges, which also fire on grilles, badges
# and headlights.
_YELLOW_HSV = ((15, 70, 90), (40, 255, 255))
_WHITE_HSV = ((0, 0, 170), (180, 45, 255))


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
    score: float  # 0-1 heuristic detection quality, not OCR confidence


class PlateDetector:
    """Contour-based rectangular plate-region detector. No pretrained model —
    deliberately lightweight for a time-boxed demo: edges -> closed contours ->
    filter by the aspect ratio and area a plate is expected to have.

    Geometry alone can't tell a plate apart from a similarly-proportioned
    region nearby (e.g. a car's grille around the plate) — it returns several
    ranked candidates and leaves picking the one that actually reads as a
    plate to the OCR stage (see PlateRecognitionService).
    """

    def detect_candidates(self, image_bgr: np.ndarray, gray: np.ndarray, top_k: int = 5) -> list[Detection]:
        candidates = self._color_candidates(image_bgr) + self._edge_candidates(gray)
        candidates.sort(key=lambda d: d.score, reverse=True)
        return self._dedupe(candidates)[:top_k]

    def _edge_candidates(self, gray: np.ndarray) -> list[Detection]:
        h, w = gray.shape[:2]
        image_area = h * w

        edges = cv2.Canny(gray, 30, 200)
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

        contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:CANDIDATES_TO_SCAN]

        candidates: list[Detection] = []
        for contour in contours:
            x, y, cw, ch = cv2.boundingRect(contour)
            if ch == 0:
                continue
            area_fraction = (cw * ch) / image_area
            aspect_ratio = cw / ch

            if not (MIN_AREA_FRACTION <= area_fraction <= MAX_AREA_FRACTION):
                continue
            if not (MIN_ASPECT_RATIO <= aspect_ratio <= MAX_ASPECT_RATIO):
                continue

            extent = cv2.contourArea(contour) / (cw * ch)  # how "filled" the box is
            aspect_score = 1 - min(abs(aspect_ratio - IDEAL_ASPECT_RATIO) / IDEAL_ASPECT_RATIO, 1)
            score = 0.5 * extent + 0.5 * aspect_score

            candidates.append(Detection(bbox=BBox(x, y, cw, ch), score=round(score, 3)))
        return candidates

    def _color_candidates(self, image_bgr: np.ndarray) -> list[Detection]:
        h, w = image_bgr.shape[:2]
        image_area = h * w
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)

        candidates: list[Detection] = []
        # Yellow and white are handled as separate masks, not OR'd together —
        # merging them before finding contours can bridge a small, tight plate
        # blob into a much larger, unrelated bright region right next to it.
        for hsv_range in (_YELLOW_HSV, _WHITE_HSV):
            mask = cv2.inRange(hsv, *hsv_range)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                x, y, cw, ch = cv2.boundingRect(contour)
                if ch == 0:
                    continue
                area_fraction = (cw * ch) / image_area
                aspect_ratio = cw / ch

                if not (MIN_AREA_FRACTION <= area_fraction <= COLOR_MAX_AREA_FRACTION):
                    continue
                if not (MIN_ASPECT_RATIO <= aspect_ratio <= MAX_ASPECT_RATIO):
                    continue

                extent = cv2.contourArea(contour) / (cw * ch)
                aspect_score = 1 - min(abs(aspect_ratio - IDEAL_ASPECT_RATIO) / IDEAL_ASPECT_RATIO, 1)
                compactness = 1 - (area_fraction / COLOR_MAX_AREA_FRACTION)
                score = min(
                    0.4 * extent + 0.4 * aspect_score + COMPACTNESS_WEIGHT * compactness + COLOR_CANDIDATE_BONUS,
                    1.0,
                )

                candidates.append(Detection(bbox=BBox(x, y, cw, ch), score=round(score, 3)))
        return candidates

    @staticmethod
    def _dedupe(candidates: list[Detection], iou_threshold: float = 0.6) -> list[Detection]:
        kept: list[Detection] = []
        for candidate in candidates:
            if not any(_iou(candidate.bbox, other.bbox) > iou_threshold for other in kept):
                kept.append(candidate)
        return kept


def _iou(a: BBox, b: BBox) -> float:
    ax2, ay2 = a.x + a.width, a.y + a.height
    bx2, by2 = b.x + b.width, b.y + b.height
    ix1, iy1 = max(a.x, b.x), max(a.y, b.y)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    intersection = (ix2 - ix1) * (iy2 - iy1)
    union = a.width * a.height + b.width * b.height - intersection
    return intersection / union if union else 0.0
