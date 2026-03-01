# ── Stage 1: Build React dashboard ───────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web
COPY server/web/package.json server/web/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY server/web/ ./
RUN npm run build

# ── Stage 2: Python server ────────────────────────────────────────────────────
FROM python:3.11-slim

# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Install Python deps
COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY shared/ ./shared/
COPY server/src/ ./server/src/
COPY server/__init__.py ./server/__init__.py

# Copy React build
COPY --from=frontend-builder /app/web/dist ./server/web/dist

# Data directory for runtime files
RUN mkdir -p /app/data /run/secrets && chown -R appuser:appuser /app /run/secrets

# Entrypoint script
COPY server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER appuser

EXPOSE 8000 8443

ENTRYPOINT ["/entrypoint.sh"]
