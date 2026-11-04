# syntax=docker/dockerfile:1
#
# Mismo patron que el resto de la familia aed (backend + frontend): un solo contenedor final; el proceso de Express
# sirve tambien el build estatico del frontend (ver backend/src/app.js). Todas las rutas de API viven bajo /api.

# ---------- Stage 1: build del frontend (Vite) ----------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
# Vite incrusta las variables VITE_* al COMPILAR, no al arrancar: hay que pasarlas como --build-arg.
# Solo si la app se sirve bajo un prefijo detras del gateway del portal (ej. --build-arg VITE_BASE_PATH=/comercial/);
# la API pasa a ser "/comercial/api" sola (ver frontend/src/api/client.js). Standalone, vacio.
ARG VITE_BASE_PATH=
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
# Solo si la API vive en otro origen (normalmente vacio: el frontend usa la ruta relativa "<base>api").
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
# Id del objeto de unidades en HubSpot (si se omite, el codigo usa 2-51798334).
ARG VITE_HUBSPOT_OBJECT_ID=
ENV VITE_HUBSPOT_OBJECT_ID=${VITE_HUBSPOT_OBJECT_ID}
RUN npm run build

# ---------- Stage 2: dependencias del backend (sin devDependencies) ----------
FROM node:20-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev

# ---------- Stage final: imagen de ejecucion ----------
FROM node:20-slim
WORKDIR /app

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Los PDF de las cotizaciones viven en disco: montar /app/data/quotes como volumen persistente.
ENV NODE_ENV=production \
    PORT=3001 \
    QUOTES_DIR=/app/data/quotes
RUN mkdir -p /app/data/quotes
VOLUME ["/app/data/quotes"]

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./entrypoint.sh"]
