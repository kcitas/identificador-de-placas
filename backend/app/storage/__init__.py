from functools import lru_cache

from app.config import get_settings
from app.storage.base import StorageService
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage


@lru_cache
def get_storage() -> StorageService:
    settings = get_settings()
    if settings.storage_backend == "s3":
        return S3Storage(bucket=settings.s3_bucket, region=settings.aws_region)
    return LocalStorage(base_path=settings.local_storage_path)
