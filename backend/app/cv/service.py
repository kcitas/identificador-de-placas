import time

import cv2

from app.config import get_settings
from app.cv.confidence import ConfidenceEstimator
from app.cv.cropper import PlateCropper
from app.cv.detector import PlateDetector
from app.cv.normalizer import PlateNormalizer
from app.cv.ocr import OCRResult, OCRService
from app.cv.preprocessor import ImagePreprocessor, InvalidImageError
from app.storage.base import StorageService

__all__ = ["InvalidImageError", "PlateRecognitionService", "PipelineResult"]


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

    def process(self, data: bytes, filename: str) -> PipelineResult:
        started = time.monotonic()

        image = self.preprocessor.decode(data)  # raises InvalidImageError -> handled by the router as 422
        image = self.preprocessor.prepare(image)
        original_url = self.storage.save(data, filename)

        try:
            return self._run_pipeline(image, original_url, started)
        except Exception as exc:  # unexpected CV/OCR failure on a real, decodable image
            return PipelineResult(
                status="error",
                plate_text=None,
                confidence=None,
                original_image_url=original_url,
                processed_image_url=None,
                detected_bbox=None,
                processing_time_ms=self._elapsed_ms(started),
                error_message=str(exc),
            )

    def _run_pipeline(self, image, original_url: str, started: float) -> PipelineResult:
        gray = self.preprocessor.enhance_gray(image)
        candidates = self.detector.detect_candidates(image, gray)

        if not candidates:
            return PipelineResult(
                status="no_plate_detected",
                plate_text=None,
                confidence=None,
                original_image_url=original_url,
                processed_image_url=None,
                detected_bbox=None,
                processing_time_ms=self._elapsed_ms(started),
                error_message=None,
            )

        # Geometry alone can't tell a plate apart from a look-alike region nearby
        # (e.g. a badge or logo that also happens to read as 5-8 characters) —
        # read every candidate and rank the results: an exact Colombian-shaped
        # read (LLLNNN/LLLNNL) always beats a merely-plausible one, and within
        # a tier the most confident OCR read wins.
        reads = [self._read_candidate(image, detection) for detection in candidates]
        chosen = max(reads, key=self._rank)

        detection = chosen["detection"]
        normalized = chosen["normalized"]
        processed_url = self._save_annotated(image, detection.bbox, original_url)

        if not normalized:
            return PipelineResult(
                status="error",
                plate_text=None,
                confidence=None,
                original_image_url=original_url,
                processed_image_url=processed_url,
                detected_bbox=detection.bbox.as_dict(),
                processing_time_ms=self._elapsed_ms(started),
                error_message="No se pudieron leer caracteres en la región de placa detectada.",
            )

        confidence = self.confidence_estimator.estimate(
            detection_score=detection.score,
            ocr_confidence=chosen["ocr_confidence"],
            is_plausible=chosen["plausible"],
            is_colombian_format=chosen["colombian_format"],
        )
        status = self.confidence_estimator.status_for(confidence, self.threshold)

        return PipelineResult(
            status=status,
            plate_text=normalized,
            confidence=confidence,
            original_image_url=original_url,
            processed_image_url=processed_url,
            detected_bbox=detection.bbox.as_dict(),
            processing_time_ms=self._elapsed_ms(started),
            error_message=None,
        )

    def _read_candidate(self, image, detection) -> dict:
        crop = self.cropper.crop(image, detection.bbox)
        crop = self.cropper.deskew(crop)
        crop = self.cropper.upscale_for_ocr(crop)

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
            OCRResult(text=a.text + b.text, confidence=(a.confidence + b.confidence) / 2)
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

            candidate_read = {
                "detection": detection,
                "normalized": normalized,
                "ocr_confidence": ocr_result.confidence,
                "plausible": self.normalizer.is_plausible(normalized),
                "colombian_format": self.normalizer.is_colombian_format(normalized),
            }
            if best is None or self._rank(candidate_read) > self._rank(best):
                best = candidate_read

        return best

    @staticmethod
    def _rank(read: dict) -> tuple[int, float]:
        tier = 2 if read["colombian_format"] else 1 if read["plausible"] else 0
        return (tier, read["ocr_confidence"])

    def _save_annotated(self, image, bbox, original_url: str) -> str:
        annotated = image.copy()
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
        filename = "processed.jpg"
        return self.storage.save(buffer.tobytes(), filename)

    @staticmethod
    def _elapsed_ms(started: float) -> int:
        return int((time.monotonic() - started) * 1000)
