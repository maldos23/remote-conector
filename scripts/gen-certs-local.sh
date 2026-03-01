#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# gen-certs-local.sh — Generate self-signed TLS certificates for local dev.
# Usage: ./scripts/gen-certs-local.sh
# Output: shared/certs/server.crt and shared/certs/server.key  (git-ignored)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$REPO_ROOT/shared/certs"

CERT="$CERT_DIR/server.crt"
KEY="$CERT_DIR/server.key"
DAYS=365
SUBJECT="/CN=matcha-cloud-local/O=matcha-cloud/C=US"

# Check openssl
if ! command -v openssl &>/dev/null; then
  echo "❌  openssl not found. Install it before running this script."
  exit 1
fi

mkdir -p "$CERT_DIR"

# Guard: skip if certs already exist (pass --force to regenerate)
if [[ -f "$CERT" && -f "$KEY" && "${1:-}" != "--force" ]]; then
  echo "ℹ️  Certs already exist at $CERT_DIR"
  echo "   Pass --force to regenerate them."
  exit 0
fi

echo "🔐 Generating self-signed TLS certificate (${DAYS}d)..."

openssl req \
  -x509 \
  -newkey rsa:4096 \
  -sha256 \
  -days "$DAYS" \
  -nodes \
  -keyout "$KEY" \
  -out "$CERT" \
  -subj "$SUBJECT" \
  -addext "subjectAltName=DNS:localhost,DNS:server,IP:127.0.0.1" \
  2>/dev/null

chmod 600 "$KEY"
chmod 644 "$CERT"

echo "✅  Certificate : $CERT"
echo "✅  Private key  : $KEY"
echo ""
echo "These files are git-ignored and stay only on your machine."
echo "To distribute the public cert to clients, copy server.crt and set"
echo "TLS_CA_CERT_PATH in the client's environment."
