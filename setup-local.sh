#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# matcha-cloud — setup-local.sh
# Levanta todo el entorno local en un solo comando.
# Uso: ./setup-local.sh  [--rebuild]  [--down]  [--logs]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colores ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET}  $1"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
fail()  { echo -e "  ${RED}✗${RESET}  $1"; exit 1; }

# ── Flags ─────────────────────────────────────────────────────────────────
REBUILD=false; LOGS_MODE=false; DOWN_MODE=false
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=true ;;
    --logs)    LOGS_MODE=true ;;
    --down)    DOWN_MODE=true ;;
  esac
done

# ── Down ──────────────────────────────────────────────────────────────────
if $DOWN_MODE; then
  step "Bajando contenedores"
  docker compose down --remove-orphans && ok "Contenedores detenidos"
  exit 0
fi

# ── Logs ──────────────────────────────────────────────────────────────────
if $LOGS_MODE; then
  docker compose logs -f
  exit 0
fi

echo -e "\n${BOLD}matcha-cloud — entorno local${RESET}"
echo "─────────────────────────────────────────────"

# ── 1. Prerequisitos ──────────────────────────────────────────────────────
step "Verificando prerequisitos"

command -v docker  >/dev/null 2>&1 || fail "Docker no encontrado. Instálalo en https://docs.docker.com/get-docker/"
command -v openssl >/dev/null 2>&1 || fail "openssl no encontrado. Instálalo con: brew install openssl"
ok "Docker:  $(docker --version | head -1)"
ok "OpenSSL: $(openssl version)"

# docker compose v2 o v1
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  fail "docker compose / docker-compose no encontrado"
fi
ok "Compose: $($COMPOSE version | head -1)"

# ── 2. TLS certs ──────────────────────────────────────────────────────────
step "Certificados TLS"

if [ -f "shared/certs/server.crt" ] && [ -f "shared/certs/server.key" ]; then
  ok "Certificados ya existen en shared/certs/"
else
  bash scripts/gen-certs-local.sh
  ok "Certificados generados en shared/certs/"
fi

# ── 3. Archivo .env ───────────────────────────────────────────────────────
step "Archivo .env"

if [ -f ".env" ]; then
  ok ".env ya existe — usando configuración existente"
else
  warn ".env no existe — generando uno nuevo"

  # Generar JWT_SECRET aleatorio (32+ bytes hex)
  JWT_SECRET=$(openssl rand -hex 32)

  # Generar CLIENT_TOKEN — necesita python3 + PyJWT
  CLIENT_TOKEN=""
  if command -v python3 >/dev/null 2>&1; then
    if python3 -c "import jwt" >/dev/null 2>&1 || pip3 install -q PyJWT python-dotenv >/dev/null 2>&1; then
      CLIENT_TOKEN=$(JWT_SECRET="$JWT_SECRET" python3 scripts/gen-client-token.py 2>/dev/null | grep CLIENT_TOKEN | cut -d= -f2)
    fi
  fi

  if [ -z "$CLIENT_TOKEN" ]; then
    warn "No se pudo generar CLIENT_TOKEN automáticamente."
    warn "Ejecuta: JWT_SECRET='$JWT_SECRET' python3 scripts/gen-client-token.py"
    warn "y pega el CLIENT_TOKEN en .env antes de levantar los clientes."
  fi

  cat > .env <<EOF
# matcha-cloud — .env (generado por setup-local.sh)
# No commitear este archivo.

HTTP_HOST=0.0.0.0
HTTP_PORT=8000
WS_HOST=0.0.0.0
WS_PORT=8443

JWT_SECRET=${JWT_SECRET}
MATCHA_USER=matcha
MATCHA_PASSWORD=m4tcha-cloud

TLS_CERT_PATH=/run/secrets/server.crt
TLS_KEY_PATH=/run/secrets/server.key

SERVER_URI=wss://server:8443
CLIENT_TOKEN=${CLIENT_TOKEN}
TLS_CA_CERT_PATH=

CORS_ORIGINS=*
EOF
  ok ".env generado"
fi

# Fuente de variables para verificación
set -a; source .env 2>/dev/null || true; set +a

if [ -z "${CLIENT_TOKEN:-}" ]; then
  warn "CLIENT_TOKEN vacío en .env. Los clientes no podrán autenticarse."
  warn "Genera uno con: JWT_SECRET='${JWT_SECRET:-<tu_secret>}' python3 scripts/gen-client-token.py"
fi

# ── 4. Build + Levantar ───────────────────────────────────────────────────
step "Construyendo imágenes Docker"

BUILD_FLAG=""
$REBUILD && BUILD_FLAG="--build"

if $REBUILD || ! docker image ls remote-conector-server --format '{{.Repository}}' 2>/dev/null | grep -q .; then
  $COMPOSE build
  ok "Build completado"
else
  ok "Imágenes ya existen (usa --rebuild para forzar réédificacion)"
fi

step "Levantando contenedores"
$COMPOSE up -d ${BUILD_FLAG:-}

# Esperar a que el server responda
MAX_WAIT=30; waited=0
echo -n "  Esperando servidor"
until curl -sf http://localhost:8000/api/health >/dev/null 2>&1; do
  sleep 1; waited=$((waited + 1))
  echo -n ".";
  [ $waited -ge $MAX_WAIT ] && echo "" && warn "El servidor tardó más de ${MAX_WAIT}s en responder" && break
done
echo ""
ok "Servidor respondiendo"

# ── 5. Resumen ────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}─────────────────────────── LISTO ──────────────────────────────${RESET}"
echo ""
echo -e "  ${BOLD}Dashboard servidor${RESET}  →  http://localhost:8000"
echo -e "  ${BOLD}UI cliente 1${RESET}        →  http://localhost:8001"
echo -e "  ${BOLD}UI cliente 2${RESET}        →  http://localhost:8002"
echo -e "  ${BOLD}UI cliente 3${RESET}        →  http://localhost:8003"
echo ""
echo -e "  ${BOLD}Login:${RESET}  ${MATCHA_USER:-matcha}  /  (ver MATCHA_PASSWORD en .env)"
echo ""
echo -e "  Estado de clientes:"
HEALTH=$(curl -sf http://localhost:8000/api/health 2>/dev/null || echo '{}')
echo -e "    $(echo $HEALTH | python3 -c 'import sys,json; h=json.load(sys.stdin); print(f\"{h.get(\"clients_connected\",0)} clientes conectados\")'  2>/dev/null || echo '?')"
echo ""
echo -e "  Comandos útiles:"
echo -e "    ./setup-local.sh --logs     # ver logs en vivo"
echo -e "    ./setup-local.sh --rebuild  # forzar rebuild completo"
echo -e "    ./setup-local.sh --down     # bajar todo"
echo -e "    docker compose logs -f server"
echo ""
echo -e "${BOLD}────────────────────────────────────────────────────────────────${RESET}"
