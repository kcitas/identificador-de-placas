# Frontend — PlateScan (Expo / React Native)

App móvil hecha con **Expo** + **Expo Router** + TypeScript. Corre en Android,
iOS y web (mismo código), y habla con el backend FastAPI del repo.

## Pantallas (`app/`)

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/` | `app/(tabs)/index.tsx` | Dashboard: totales + últimos reconocimientos |
| `/scanner` | `app/(tabs)/scanner.tsx` | Cámara (`expo-camera`) o galería (`expo-image-picker`) → sube la foto → muestra la(s) placa(s) leída(s) |
| `/history` | `app/(tabs)/history.tsx` | Historial paginado con filtro por estado |
| `/statistics` | `app/(tabs)/statistics.tsx` | Estadísticas por día y por estado |
| `/recognitions/:id` | `app/recognitions/[id].tsx` | Detalle de un reconocimiento (bounding box, confianza, eliminar) |

`src/api/` es el cliente HTTP (mismos endpoints `/api/v1/...` del backend),
`src/components/` los componentes compartidos y `src/theme.ts` la paleta.

## Correr en el celular (desarrollo)

```bash
npm install
npx expo start
```

Escanea el QR con la app **Expo Go** (Android/iOS) — el celular y el
computador tienen que estar en el mismo WiFi. El backend tiene que estar
corriendo en el computador (`uvicorn ... --host 0.0.0.0 --port 8000`): la app
deduce sola la IP del computador a partir del servidor de Metro y llama a
`http://<esa-ip>:8000`, así que no hay que configurar nada. Si el backend está
en otro host, ponlo en `EXPO_PUBLIC_API_URL` (ver `.env.example`).

Para web en desarrollo: `npx expo start --web` (abre `http://localhost:8081`
y llama a `http://localhost:8000`; el backend debe permitir ese origen en
`CORS_ORIGINS`).

## Build web (lo que sirve nginx en Docker)

```bash
npx expo export --platform web   # genera dist/
```

El `Dockerfile` hace exactamente eso y sirve `dist/` con nginx; en
`docker-compose` la app queda detrás del gateway y llama al API en el mismo
origen (`EXPO_PUBLIC_API_URL` vacío).

## Build nativo

Para un APK/IPA instalable (fuera de Expo Go) se usa EAS Build:
`npx eas build --platform android` (requiere cuenta de Expo). No es necesario
para desarrollar ni para la demo con Expo Go.
