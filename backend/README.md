# Backend — Reconocimiento de Placas

FastAPI + SQLAlchemy + Alembic + PostgreSQL + OpenCV + Tesseract OCR.

## Pipeline de visión por computador

```
imagen → validación (¿es una imagen real?) → preprocesamiento (resize, gris, CLAHE)
       → detección (contornos + aspect ratio típico de placa)
       → recorte + corrección (deskew, binarizado)
       → OCR (Tesseract, whitelist alfanumérico)
       → normalización de texto (mayúsculas, solo A-Z0-9, corrección de confusiones O/0 I/1...)
       → validación de plausibilidad → resultado
```

Si no se detecta ninguna región de placa, el `status` es exactamente
`"no_plate_detected"`. El sistema nunca inventa un texto de placa: si el OCR no
logra leer nada sobre una región sí detectada, el resultado es `status: "error"`
con `error_message` explicando por qué.

Módulos en `app/cv/`: `ImagePreprocessor`, `PlateDetector`, `PlateCropper`
(recorte/deskew/binarizado — el paso de "corrección" del pipeline),
`OCRService`, `PlateNormalizer` (normalización del texto post-OCR),
`ConfidenceEstimator`, `PlateRecognitionService` (orquesta todo).

## Storage

`app/storage/`: `StorageService` (interfaz), `LocalStorage` (dev, guarda en
`LOCAL_STORAGE_PATH` y se sirve en `/media/...`), `S3Storage` (lista para AWS,
activada con `STORAGE_BACKEND=s3` — usa el IAM Role de la instancia EC2, nunca
credenciales hardcodeadas).

## Endpoints (`/api/v1`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{"status": "ok"}` |
| POST | `/recognitions` | multipart `image` → corre el pipeline, guarda y devuelve el `Recognition` |
| GET | `/recognitions?skip=&limit=&status=` | lista paginada |
| GET | `/recognitions/{id}` | detalle |
| DELETE | `/recognitions/{id}` | borra el registro y sus imágenes |
| GET | `/statistics` | totales, tasa de éxito, confianza/tiempo promedio, por día, por status |

## Correr en local (sin Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # editar DATABASE_URL si tu Postgres local usa otro usuario/puerto
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Requiere `tesseract-ocr` instalado en el sistema (`brew install tesseract` en
macOS; en Docker ya se instala en el `Dockerfile`).

## Docker Compose

El `docker-compose.yml` de la raíz del proyecto arma `db` (nombre de host
`db`, usado en `DATABASE_URL`) + este servicio (`backend`, puerto 8000
interno) + `frontend` + el gateway `nginx`. Las migraciones corren
automáticamente al arrancar el contenedor (`alembic upgrade head` antes de
`uvicorn`, ver `CMD` en el `Dockerfile`).
