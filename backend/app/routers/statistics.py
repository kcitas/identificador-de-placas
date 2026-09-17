from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recognition
from app.schemas import StatisticsOut

router = APIRouter(prefix="/api/v1/statistics", tags=["statistics"])

ALL_STATUSES = ["success", "no_plate_detected", "low_confidence", "error"]


@router.get("", response_model=StatisticsOut)
def get_statistics(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Recognition)) or 0

    by_status: dict[str, int] = dict.fromkeys(ALL_STATUSES, 0)
    for status, count in db.execute(
        select(Recognition.status, func.count()).group_by(Recognition.status)
    ):
        by_status[status] = count

    success_count = by_status["success"]

    avg_confidence = db.scalar(
        select(func.avg(Recognition.confidence)).where(Recognition.confidence.is_not(None))
    )
    avg_processing_time_ms = db.scalar(select(func.avg(Recognition.processing_time_ms)))

    by_day_rows = db.execute(
        select(func.date(Recognition.created_at), func.count())
        .group_by(func.date(Recognition.created_at))
        .order_by(func.date(Recognition.created_at))
    ).all()
    recognitions_by_day = [{"date": str(day), "count": count} for day, count in by_day_rows]

    return StatisticsOut(
        total_recognitions=total,
        success_count=success_count,
        success_rate=round(success_count / total, 3) if total else 0.0,
        avg_confidence=round(avg_confidence, 3) if avg_confidence is not None else None,
        avg_processing_time_ms=round(avg_processing_time_ms, 1) if avg_processing_time_ms is not None else None,
        recognitions_by_day=recognitions_by_day,
        recognitions_by_status=by_status,
    )
