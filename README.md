# Reconocimiento de Placas — proyecto de Ciencia de Datos

Aplicación web para capturar una foto de un vehículo desde el celular, detectar la
placa (una o varias, si la foto tiene más de un carro), leerla con OCR y guardar
el historial. Pensada para desplegarse en AWS (EC2 + RDS/Postgres + S3), pero
funciona 100% en local con Docker Compose mientras se provisiona la infraestructura.

## Arquitectura

```
                    ┌──────────────┐
   navegador  ───▶  │  nginx (80)  │  gateway único: expone solo este puerto
   (celular)        └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
      / → frontend:80              /api/, /media/ → backend:8000
      (build web de Expo,          (FastAPI, pipeline YOLO+OCR,
       servido por nginx)           sirve imágenes guardadas)

   app móvil (Expo Go / APK)  ───▶  /api/, /media/ del mismo gateway
                                            │
                                            ▼
                                     db (PostgreSQL)
```

En producción (AWS) solo el puerto 80/443 del gateway debe estar abierto en el
security group de la instancia EC2; frontend, backend y db quedan en la red
interna de Docker.

## Stack

- **Frontend**: Expo (React Native) + TypeScript + Expo Router. App móvil para
  Android/iOS (en desarrollo se prueba con Expo Go) que también compila a web
  con el mismo código — ese build web es lo que sirve nginx en Docker.
- **Backend**: FastAPI + SQLAlchemy + Alembic + Pydantic.
- **Base de datos**: PostgreSQL.
- **Visión por computador**: YOLOv8 pre-entrenado (detección de la región de
  la placa) + EasyOCR (lectura de caracteres, CRAFT + CRNN) + corrección al
  formato colombiano de placas (3 letras + 3 dígitos, o 3 letras + 2 dígitos +
  1 letra en motos).
- **Infraestructura**: Docker, Docker Compose, Nginx como gateway/reverse proxy.

## Correr todo con Docker Compose (recomendado para probar end-to-end)

```bash
cp .env.example .env          # editar si hace falta (usuario/clave de Postgres, etc.)
cp backend/.env.example backend/.env
docker compose up --build
```

Abrir `http://<ip-de-tu-máquina>:80` desde el celular (mismo WiFi que tu
computador) o `http://localhost` desde el navegador de escritorio.

## Correr en modo desarrollo (más rápido para iterar mientras programamos)

Frontend (app móvil):
```bash
cd frontend
npm install
npx expo start
```
Escanea el QR con **Expo Go** en el celular (mismo WiFi que el computador).
La app deduce sola la IP del computador y llama al backend en
`http://<ip>:8000`, no hay que configurar nada. Para probar en el navegador:
`npx expo start --web` (abre `http://localhost:8081`). Más detalle en
`frontend/README.md`.

Backend (requiere Postgres corriendo, p.ej. `docker compose up db`):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Variables de entorno

Ver `.env.example` (raíz, para docker-compose) y `backend/.env.example` (backend).
**Nunca** se commitean valores reales de AWS (IP, dominio, bucket, credenciales) —
todo se inyecta por variables de entorno al desplegar.

## Despliegue en AWS (cuando la infraestructura esté lista)

1. En la instancia EC2: instalar Docker + Docker Compose, clonar el repo.
2. Completar `.env` con `CORS_ORIGINS` apuntando al dominio/IP elástica real,
   `EXPO_PUBLIC_API_URL` (vacío si se usa el gateway nginx, que es lo recomendado), y si
   se usa S3 para las imágenes: `STORAGE_BACKEND=s3`, `AWS_REGION`, `S3_BUCKET`
   (con un IAM Role adjunto a la instancia — no credenciales hardcodeadas).
3. `docker compose up -d --build`.
4. Abrir el puerto 80 (y 443 si se agrega TLS) en el security group.
5. Apuntar el DNS/IP elástica al puerto del gateway.

## Estructura

```
frontend/   Expo (React Native) + Expo Router — app móvil, también compila a web
backend/    FastAPI + SQLAlchemy + Alembic + pipeline YOLO/OCR + storage (local/S3)
nginx/      Config del gateway (reverse proxy a frontend y backend)
docker-compose.yml
```
