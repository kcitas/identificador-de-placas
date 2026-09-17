DETECTION_WEIGHT = 0.25
OCR_WEIGHT = 0.75
PLAUSIBILITY_BONUS = 0.1
COLOMBIAN_FORMAT_BONUS = 0.25  # matching the exact LLLNNN/LLLNNL shape is a much stronger signal


class ConfidenceEstimator:
    """Combines detection quality and OCR confidence into one score used to
    decide whether a read counts as `success` or `low_confidence`.
    """

    def estimate(self, detection_score: float, ocr_confidence: float, is_plausible: bool, is_colombian_format: bool = False) -> float:
        score = DETECTION_WEIGHT * detection_score + OCR_WEIGHT * ocr_confidence
        if is_colombian_format:
            score = min(score + COLOMBIAN_FORMAT_BONUS, 1.0)
        elif is_plausible:
            score = min(score + PLAUSIBILITY_BONUS, 1.0)
        return round(score, 3)

    def status_for(self, confidence: float, threshold: float) -> str:
        return "success" if confidence >= threshold else "low_confidence"
