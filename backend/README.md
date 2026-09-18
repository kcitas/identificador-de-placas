# Backend — Reconocimiento de Placas

FastAPI + SQLAlchemy + Alembic + PostgreSQL + YOLOv8 + EasyOCR.

## Pipeline de visión por computador

```
imagen → validación (¿es una imagen real?) → preprocesamiento (resize, gris, CLAHE)
       → detección (YOLOv8 pre-entrenado para placas, varios candidatos por confianza)
       → por cada candidato: recorte + corrección (deskew, upscale/nitidez)
       → OCR (EasyOCR, whitelist alfanumérico, cada bloque de texto que encuentre)
       → normalización de texto (mayúsculas, solo A-Z0-9, formato colombiano
         LLLNNN/LLLNNL con corrección de confusiones O/0 I/1 S/5 B/8 G/6 Z/2
         según la posición esperada)
       → se descartan candidatos que se solapan (misma placa física) y se
         devuelve un resultado por cada placa distinta que sí se pudo leer
```

Una foto puede tener **más de una placa** (varios carros): el pipeline
devuelve un resultado por cada una que logre leerse en formato colombiano
válido, no solo la mejor. Si no se detecta ninguna región de placa, el
`status` es exactamente `"no_plate_detected"`. El sistema nunca inventa un
texto de placa: si el OCR no logra leer nada sobre una región sí detectada,
el resultado es `status: "error"` con `error_message` explicando por qué.

La caja (`detected_bbox`) que se devuelve es la posición exacta del texto que
reportó EasyOCR (traducida a las coordenadas de la imagen original), no la
región aproximada que usó el detector para encontrar la placa — por eso queda
ajustada al texto y no a todo el parachoques/parrilla alrededor.

Módulos en `app/cv/`: `ImagePreprocessor`, `PlateDetector` (YOLOv8
pre-entrenado, un solo modelo/clase `license_plate`, pesos descargados de
[Koushim/yolov8-license-plate-detection](https://huggingface.co/Koushim/yolov8-license-plate-detection)
la primera vez que corre — ver `MODEL_REPO_ID` en `app/cv/detector.py`),
`PlateCropper` (recorte/deskew/upscale — el paso de "corrección" del
pipeline), `OCRService` (EasyOCR), `PlateNormalizer` (normalización + ajuste
al formato colombiano), `ConfidenceEstimator`, `PlateRecognitionService`
(orquesta todo, y decide si una foto tiene una o varias placas).

## Storage

`app/storage/`: `StorageService` (interfaz), `LocalStorage` (dev, guarda en
`LOCAL_STORAGE_PATH` y se sirve en `/media/...`), `S3Storage` (lista para AWS,
activada con `STORAGE_BACKEND=s3` — usa el IAM Role de la instancia EC2, nunca
credenciales hardcodeadas).

## Endpoints (`/api/v1`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{"status": "ok"}` |
| POST | `/recognitions` | multipart `image` → corre el pipeline y devuelve un **array** de `Recognition`, uno por cada placa encontrada en la foto (casi siempre uno solo) |
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

La primera vez que corre, EasyOCR descarga sus modelos (~100MB) a
`~/.EasyOCR` y el detector YOLOv8 descarga sus pesos (~6MB) a
`app/cv/weights/` (gitignored); el `Dockerfile` los baja en build time para
que el contenedor no lo haga en el primer request. No requiere nada del
sistema aparte de `libgl1`/`libglib2.0-0` (ya en el `Dockerfile`, para
OpenCV).

## Docker Compose

El `docker-compose.yml` de la raíz del proyecto arma `db` (nombre de host
`db`, usado en `DATABASE_URL`) + este servicio (`backend`, puerto 8000
interno) + `frontend` + el gateway `nginx`. Las migraciones corren
automáticamente al arrancar el contenedor (`alembic upgrade head` antes de
`uvicorn`, ver `CMD` en el `Dockerfile`).
