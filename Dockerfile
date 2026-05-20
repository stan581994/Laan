# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Backend: install dependencies into a venv
WORKDIR /app/backend
COPY backend/pyproject.toml ./
RUN uv venv .venv && uv pip install --python .venv/bin/python \
    fastapi "uvicorn[standard]" sqlalchemy httpx python-multipart

# Copy backend source
COPY backend/ .

# Frontend: copy built assets to nginx
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/laan.conf

# Data directory for SQLite (mounted as volume)
RUN mkdir -p /data

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s \
    CMD curl -f http://localhost:7070/health || exit 1

EXPOSE 5000 7070

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/laan.conf"]
