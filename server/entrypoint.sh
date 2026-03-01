#!/bin/sh
set -e

# ── TLS certificate setup ─────────────────────────────────────────────────────
# If TLS_CERT_PATH and TLS_KEY_PATH are not set, generate ephemeral self-signed certs.
# In production (GCloud), certs are downloaded from Secret Manager by gcloud-deploy.sh
# before this script runs, and injected via environment variables or mounted files.

CERT="${TLS_CERT_PATH:-/run/secrets/server.crt}"
KEY="${TLS_KEY_PATH:-/run/secrets/server.key}"

if [ ! -f "$CERT" ] || [ ! -f "$KEY" ]; then
  echo "[matcha] TLS certs not found — generating ephemeral self-signed cert..."
  openssl req -x509 \
    -newkey rsa:2048 \
    -keyout "$KEY" \
    -out "$CERT" \
    -days 365 \
    -nodes \
    -subj "/CN=matcha-cloud/O=matcha/C=US" \
    -addext "subjectAltName=IP:0.0.0.0" \
    2>/dev/null
  echo "[matcha] Ephemeral cert generated at $CERT"
fi

export TLS_CERT_PATH="$CERT"
export TLS_KEY_PATH="$KEY"

echo "[matcha] Starting server: HTTP=:${HTTP_PORT:-8000}  WSS=:${WS_PORT:-8443}"
exec python -m server.src.main
