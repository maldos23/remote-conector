#!/bin/sh
set -e

# ── TLS CA cert for verifying server ─────────────────────────────────────────
# In GCloud, the server's CA cert is downloaded and set via TLS_CA_CERT_PATH.
# In dev, leave unset to skip verification (ws_client.py logs a warning).

echo "[matcha-client] CLIENT_ID_FILE=${CLIENT_ID_FILE:-/app/data/client_id.txt}"
echo "[matcha-client] SERVER_URI=${SERVER_URI:-wss://localhost:8443}"
echo "[matcha-client] Starting..."

exec python -m client.src.main
