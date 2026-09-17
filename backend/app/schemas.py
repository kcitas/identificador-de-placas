from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

RecognitionStatus = Literal["success", "no_plate_detected", "low_confidence", "error"]


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class RecognitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plate_text: str | None
    confidence: float | None
    original_image_url: str
    processed_image_url: str | None
    detected_bbox: BoundingBox | None
    processing_time_ms: int
    status: RecognitionStatus
    error_message: str | None
    created_at: datetime


class RecognitionListOut(BaseModel):
    items: list[RecognitionOut]
    total: int
    skip: int
    limit: int


class StatisticsOut(BaseModel):
    total_recognitions: int
    success_count: int
    success_rate: float
    avg_confidence: float | None
    avg_processing_time_ms: float | None
    recognitions_by_day: list[dict]
    recognitions_by_status: dict[str, int]
