import os
import uuid

from app.storage.base import StorageService

MEDIA_URL_PREFIX = "/media"


class LocalStorage(StorageService):
    def __init__(self, base_path: str):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    def save(self, data: bytes, filename: str) -> str:
        ext = os.path.splitext(filename)[1] or ".jpg"
        name = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(self.base_path, name), "wb") as f:
            f.write(data)
        return f"{MEDIA_URL_PREFIX}/{name}"

    def delete(self, url: str) -> None:
        name = url.rsplit("/", 1)[-1]
        path = os.path.join(self.base_path, name)
        if os.path.exists(path):
            os.remove(path)
