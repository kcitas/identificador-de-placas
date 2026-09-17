import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import recognitions, statistics

settings = get_settings()

app = FastAPI(title="Reconocimiento de Placas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.local_storage_path, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.local_storage_path), name="media")

app.include_router(recognitions.router)
app.include_router(statistics.router)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
