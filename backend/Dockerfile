FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# EasyOCR downloads its detection/recognition weights on first use — bake them
# into the image at build time so the container doesn't fetch ~100MB from the
# network on its first request in production.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

COPY . .

RUN mkdir -p /app/media
EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
