from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.cv.preprocessor import InvalidImageError
from app.cv.service import PlateRecognitionService
from app.database import get_db
from app.models import Recognition
from app.schemas import RecognitionListOut, RecognitionOut, RecognitionStatus
from app.storage import get_storage

router = APIRouter(prefix="/api/v1/recognitions", tags=["recognitions"])


def get_service() -> PlateRecognitionService:
    return PlateRecognitionService(storage=get_storage())


@router.post("", response_model=RecognitionOut, status_code=201)
async def create_recognition(
    image: UploadFile,
    db: Session = Depends(get_db),
    service: PlateRecognitionService = Depends(get_service),
):
    data = await image.read()
    if not data:
        raise HTTPException(status_code=422, detail="El archivo de imagen está vacío.")

    try:
        result = service.process(data, image.filename or "capture.jpg")
    except InvalidImageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    recognition = Recognition(
        plate_text=result.plate_text,
        confidence=result.confidence,
        original_image_url=result.original_image_url,
        processed_image_url=result.processed_image_url,
        detected_bbox=result.detected_bbox,
        processing_time_ms=result.processing_time_ms,
        status=result.status,
        error_message=result.error_message,
    )
    db.add(recognition)
    db.commit()
    db.refresh(recognition)
    return recognition


@router.get("", response_model=RecognitionListOut)
def list_recognitions(
    skip: int = 0,
    limit: int = 20,
    status: RecognitionStatus | None = None,
    db: Session = Depends(get_db),
):
    query = select(Recognition)
    if status:
        query = query.where(Recognition.status == status)

    count_query = select(func.count()).select_from(Recognition)
    if status:
        count_query = count_query.where(Recognition.status == status)
    total = db.scalar(count_query) or 0

    items = (
        db.scalars(query.order_by(Recognition.created_at.desc()).offset(skip).limit(limit)).all()
    )
    return RecognitionListOut(items=items, total=total, skip=skip, limit=limit)


@router.get("/{recognition_id}", response_model=RecognitionOut)
def get_recognition(recognition_id: UUID, db: Session = Depends(get_db)):
    recognition = db.get(Recognition, recognition_id)
    if recognition is None:
        raise HTTPException(status_code=404, detail="Reconocimiento no encontrado.")
    return recognition


@router.delete("/{recognition_id}", status_code=204)
def delete_recognition(
    recognition_id: UUID,
    db: Session = Depends(get_db),
    service: PlateRecognitionService = Depends(get_service),
):
    recognition = db.get(Recognition, recognition_id)
    if recognition is None:
        raise HTTPException(status_code=404, detail="Reconocimiento no encontrado.")

    for url in (recognition.original_image_url, recognition.processed_image_url):
        if url:
            service.storage.delete(url)

    db.delete(recognition)
    db.commit()
