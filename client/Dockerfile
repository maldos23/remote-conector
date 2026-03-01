# ── Stage 1: Build React status page ─────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web
COPY client/web/package.json client/web/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY client/web/ ./
RUN npm run build

# ── Stage 2: Python client ────────────────────────────────────────────────────
FROM python:3.11-slim

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install deps incl. psutil (needs build tools briefly)
RUN apt-get update && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY client/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY shared/ ./shared/
COPY client/src/ ./client/src/
COPY client/__init__.py ./client/__init__.py

# Copy React build
COPY --from=frontend-builder /app/web/dist ./client/web/dist

# Runtime dirs
RUN mkdir -p /app/data && chown -R appuser:appuser /app

COPY client/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

EXPOSE 8001

ENTRYPOINT ["/entrypoint.sh"]
