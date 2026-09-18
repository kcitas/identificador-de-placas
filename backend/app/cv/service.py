import time

import cv2

from app.config import get_settings
from app.cv.confidence import ConfidenceEstimator
from app.cv.cropper import PlateCropper
from app.cv.detector import BBox, PlateDetector
from app.cv.normalizer import PlateNormalizer
from app.cv.ocr import LocalBBox, OCRResult, OCRService
from app.cv.preprocessor import ImagePreprocessor, InvalidImageError
from app.storage.base import StorageService

__all__ = ["InvalidImageError", "PlateRecognitionService", "PipelineResult"]

OVERLAP_THRESHOLD = 0.4  # two reads this close are the same physical plate, not two different ones
# A 6-character plate code, as a text line, is never anywhere close to square —
# this catches false positives where some unrelated text elsewhere in the photo
# (a UI icon row, a logo, a sign) happens to OCR into a valid-shaped string.
MIN_TEXT_ASPECT_RATIO = 1.6
MAX_TEXT_ASPECT_RATIO = 7.0
MULTI_PLATE_MIN_CONFIDENCE = 0.9  # only for reporting >1 plate — see _run_pipeline


class PipelineResult:
    def __init__(
        self,
        *,
        status: str,
        plate_text: str | None,
        confidence: float | None,
        original_image_url: str,
        processed_image_url: str | None,
        detected_bbox: dict | None,
        processing_time_ms: int,
        error_message: str | None,
    ):
        self.status = status
        self.plate_text = plate_text
        self.confidence = confidence
        self.original_image_url = original_image_url
        self.processed_image_url = processed_image_url
        self.detected_bbox = detected_bbox
        self.processing_time_ms = processing_time_ms
        self.error_message = error_message


class PlateRecognitionService:
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.preprocessor = ImagePreprocessor()
        self.detector = PlateDetector()
        self.cropper = PlateCropper()
        self.ocr = OCRService()
        self.normalizer = PlateNormalizer()
        self.confidence_estimator = ConfidenceEstimator()
        self.threshold = get_settings().low_confidence_threshold

    def process(self, data: bytes, filename: str) -> list[PipelineResult]:
        """Returns one PipelineResult per plate found in the photo (usually
        one, but a photo can show more than one vehicle/plate)."""
        started = time.monotonic()

        image = self.preprocessor.decode(data)  # raises InvalidImageError -> handled by the router as 422
        image = self.preprocessor.prepare(image)
        original_url = self.storage.save(data, filename)

        try:
            return self._run_pipeline(image, original_url, started)
        except Exception as exc:  # unexpected CV/OCR failure on a real, decodable image
            return [
                PipelineResult(
                    status="error",
                    plate_text=None,
                    confidence=None,
                    original_image_url=original_url,
                    processed_image_url=None,
                    detected_bbox=None,
                    processing_time_ms=self._elapsed_ms(started),
                    error_message=str(exc),
                )
            ]

    def _run_pipeline(self, image, original_url: str, started: float) -> list[PipelineResult]:
        gray = self.preprocessor.enhance_gray(image)
        candidates = self.detector.detect_candidates(image, gray, top_k=8)

        if not candidates:
            return [
                PipelineResult(
                    status="no_plate_detected",
                    plate_text=None,
                    confidence=None,
                    original_image_url=original_url,
                    processed_image_url=None,
                    detected_bbox=None,
                    processing_time_ms=self._elapsed_ms(started),
                    error_message=None,
                )
            ]

        # Geometry alone can't tell a plate apart from a look-alike region nearby
        # (e.g. a badge or logo that also happens to read as 5-8 characters) —
        # read every candidate region and rank its own best read: an exact
        # Colombian-shaped read (LLLNNN/LLLNNL) always beats a merely-plausible
        # one, and within a tier the most confident OCR read wins.
        reads = [self._read_candidate(image, detection) for detection in candidates]
        plate_reads = self._dedupe_by_overlap([r for r in reads if r["colombian_format"]])

        if len(plate_reads) > 1:
            # Claiming "this photo has several distinct plates" is a stronger
            # claim than reporting just one — hold it to a higher bar so an
            # unrelated bit of text elsewhere in the photo (a logo, a sign, a
            # UI element) that happens to read as a plausible plate doesn't
            # get reported as a second vehicle. A single confident read never
            # needs this extra bar.
            plate_reads = [r for r in plate_reads if r["ocr_confidence"] >= MULTI_PLATE_MIN_CONFIDENCE] or [
                max(plate_reads, key=self._rank)
            ]

        if plate_reads:
            # One or more plates read cleanly — a single shared annotated image
            # (every found plate boxed) rather than the coarse candidate's box.
            processed_url = self._save_annotated(image, [r["bbox"] for r in plate_reads], original_url)
            return [self._build_result(r, original_url, processed_url, started) for r in plate_reads]

        # Nothing hit the strict Colombian shape — fall back to the single best
        # attempt overall so the user still sees *something* (low_confidence or
        # a plain error), same as when there's clearly only one plate to find.
        chosen = max(reads, key=self._rank)
        processed_url = self._save_annotated(image, [chosen["bbox"]], original_url)
        return [self._build_result(chosen, original_url, processed_url, started)]

    def _build_result(self, read: dict, original_url: str, processed_url: str, started: float) -> PipelineResult:
        normalized = read["normalized"]
        if not normalized:
            return PipelineResult(
                status="error",
                plate_text=None,
                confidence=None,
                original_image_url=original_url,
                processed_image_url=processed_url,
                detected_bbox=read["bbox"].as_dict(),
                processing_time_ms=self._elapsed_ms(started),
                error_message="No se pudieron leer caracteres en la región de placa detectada.",
            )

        confidence = self.confidence_estimator.estimate(
            detection_score=read["detection"].score,
            ocr_confidence=read["ocr_confidence"],
            is_plausible=read["plausible"],
            is_colombian_format=read["colombian_format"],
        )
        status = self.confidence_estimator.status_for(confidence, self.threshold)

        return PipelineResult(
            status=status,
            plate_text=normalized,
            confidence=confidence,
            original_image_url=original_url,
            processed_image_url=processed_url,
            detected_bbox=read["bbox"].as_dict(),
            processing_time_ms=self._elapsed_ms(started),
            error_message=None,
        )

    def _read_candidate(self, image, detection) -> dict:
        crop, x0, y0 = self.cropper.crop(image, detection.bbox)
        crop = self.cropper.deskew(crop)
        crop, scale = self.cropper.upscale_for_ocr(crop)

        # EasyOCR does its own preprocessing internally — feed it the
        # deskewed/upscaled crop directly rather than a binarized version.
        # A crop can contain more than one text block: the code and, below
        # it, the city/country name — but also, sometimes, the code itself
        # split into two blocks (e.g. a decorative dot between "WUF" and
        # "62C" breaks the line in two). Rank every individual block AND
        # every adjacent pair concatenated (in both orders), and keep
        # whichever turns out plate-shaped.
        ocr_results = self.ocr.read(crop)
        pairs = [
            OCRResult(
                text=a.text + b.text,
                confidence=(a.confidence + b.confidence) / 2,
                bbox=self._union_bbox(a.bbox, b.bbox),
            )
            for i, a in enumerate(ocr_results)
            for j, b in enumerate(ocr_results)
            if i != j
        ]

        best: dict | None = None
        for ocr_result in [*ocr_results, *pairs]:
            normalized = self.normalizer.normalize(ocr_result.text)
            fitted = self.normalizer.fit_colombian_format(normalized)
            if fitted:
                normalized = fitted

            # EasyOCR's own text box, translated back to the original image's
            # coordinates — tighter around the actual characters than the
            # YOLO box, which just located the plate region in the first place.
            bbox = self._translate_bbox(ocr_result.bbox, x0, y0, scale) if ocr_result.bbox else detection.bbox

            candidate_read = {
                "detection": detection,
                "bbox": bbox,
                "normalized": normalized,
                "ocr_confidence": ocr_result.confidence,
                "plausible": self.normalizer.is_plausible(normalized),
                "colombian_format": self.normalizer.is_colombian_format(normalized) and self._is_plate_shaped(bbox),
            }
            if best is None or self._rank(candidate_read) > self._rank(best):
                best = candidate_read

        return best

    @staticmethod
    def _is_plate_shaped(bbox: BBox) -> bool:
        if bbox.height == 0:
            return False
        aspect_ratio = bbox.width / bbox.height
        return MIN_TEXT_ASPECT_RATIO <= aspect_ratio <= MAX_TEXT_ASPECT_RATIO

    @staticmethod
    def _translate_bbox(local_bbox, x0: int, y0: int, scale: float) -> BBox:
        return BBox(
            x=int(local_bbox.x / scale) + x0,
            y=int(local_bbox.y / scale) + y0,
            width=int(local_bbox.width / scale),
            height=int(local_bbox.height / scale),
        )

    @staticmethod
    def _union_bbox(a, b):
        if a is None or b is None:
            return a or b
        x0, y0 = min(a.x, b.x), min(a.y, b.y)
        x1, y1 = max(a.x + a.width, b.x + b.width), max(a.y + a.height, b.y + b.height)
        return LocalBBox(x=x0, y=y0, width=x1 - x0, height=y1 - y0)

    @staticmethod
    def _rank(read: dict) -> tuple[int, float]:
        tier = 2 if read["colombian_format"] else 1 if read["plausible"] else 0
        return (tier, read["ocr_confidence"])

    @staticmethod
    def _dedupe_by_overlap(reads: list[dict]) -> list[dict]:
        """Two YOLO candidate boxes can both land on the same physical plate
        (overlapping detections above the confidence threshold) — keep the
        higher-ranked read of each overlapping group so one real plate
        doesn't get reported twice."""
        kept: list[dict] = []
        for read in sorted(reads, key=PlateRecognitionService._rank, reverse=True):
            if not any(PlateRecognitionService._iou(read["bbox"], k["bbox"]) > OVERLAP_THRESHOLD for k in kept):
                kept.append(read)
        return kept

    @staticmethod
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

    def _save_annotated(self, image, bboxes: list, original_url: str) -> str:
        annotated = image.copy()
        for bbox in bboxes:
            cv2.rectangle(
                annotated,
                (bbox.x, bbox.y),
                (bbox.x + bbox.width, bbox.y + bbox.height),
                (0, 220, 100),
                3,
            )
        ok, buffer = cv2.imencode(".jpg", annotated)
        if not ok:
            return original_url
        return self.storage.save(buffer.tobytes(), "processed.jpg")

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        return int((time.monotonic() - started) * 1000)
