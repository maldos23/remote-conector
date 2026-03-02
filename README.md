# Remote Connector — Distributed Remote Administration System

A production-ready system for remote administration of distributed nodes. The server exposes a web dashboard and receives secure WebSocket (WSS) connections from client nodes. From the dashboard you can monitor real-time metrics, execute remote commands, and manage client connections.

[🇪🇸 Leer en Español](README.es.md)

---

## Features

- **Web Dashboard**: React + Vite SPA with real-time metrics, command execution and client management
- **Secure WebSocket**: WSS connections with JWT authentication between server and clients
- **Real-time Metrics**: CPU, RAM and disk monitoring with historical charts
- **Remote Command Execution**: Send shell commands to any connected client and receive output
- **Dual JWT Auth**: Separate token types for dashboard users (24h) and client nodes (30d)
- **Auto-reconnect**: Clients reconnect automatically with exponential backoff (5s → 300s max)
- **Docker**: Both server and clients run as Docker containers
- **GCloud Ready**: Designed for Google Cloud Platform e2-small VMs

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                Google Cloud Platform              │
│                                                  │
│  ┌─────────────────────────────────┐             │
│  │  matcha-server (34.136.130.26)  │◄── Browser  │
│  │  FastAPI HTTP  :8000            │    (HTTPS)  │
│  │  WebSocket WSS :8443            │             │
│  └─────┬──────────────────────────┘             │
│        │ WSS :8443                               │
│   ┌────▼────┐  ┌─────────┐  ┌─────────┐        │
│   │client-1 │  │client-2 │  │client-3 │        │
│   │:8000    │  │:8000    │  │:8000    │        │
│   └─────────┘  └─────────┘  └─────────┘        │
└──────────────────────────────────────────────────┘
```

**Connection flow:**
1. Client reads its JWT (`CLIENT_TOKEN`) and persistent `client_id`
2. Client connects to `wss://server:8443` and sends auth message with hostname and http_port
3. Server validates the JWT (type `client`) and registers the client in the in-memory registry
4. Client sends heartbeat metrics every 30 seconds
5. Dashboard user logs in → receives `access` JWT → calls REST API
6. Commands sent from dashboard are dispatched to the target client via WebSocket

---

## Project Structure

```
remote-conector/
├── server/                  # Server application
│   ├── src/
│   │   ├── api/             # FastAPI routes + JWT middleware
│   │   │   ├── routes/      # auth, clients, commands endpoints
│   │   │   └── middleware/  # JWT validation
│   │   └── core/
│   │       ├── ws_server.py          # WebSocket server (WSS :8443)
│   │       ├── client_registry.py    # In-memory client registry
│   │       └── command_dispatcher.py # Asyncio-based command correlation
│   ├── web/                 # React + Vite frontend (compiled into server image)
│   │   └── src/
│   │       ├── pages/       # Dashboard, Login, ClientDetail
│   │       └── components/  # ClientCard, CommandInput, ResourceChart...
│   └── Dockerfile
├── client/                  # Client application
│   ├── src/
│   │   ├── api/             # FastAPI HTTP :8000 (client metrics endpoint)
│   │   └── core/
│   │       ├── ws_client.py          # WebSocket client (connects to server)
│   │       ├── metrics_collector.py  # psutil CPU/RAM/disk
│   │       └── process_runner.py     # subprocess command execution
│   └── Dockerfile
├── shared/                  # Shared between server and client
│   ├── auth.py              # JWT creation and validation (PyJWT HS256)
│   └── messages.py          # Message type definitions
├── scripts/
│   ├── gen-certs-local.sh   # Generate self-signed TLS certs
│   ├── gen-client-token.py  # Generate client JWT tokens
│   └── gcloud-deploy.sh     # GCloud deployment helper
├── doc/
│   ├── ARCHITECTURE.md
│   ├── DOCKER.md
│   └── EXAMPLES.md
├── docker-compose.yml           # Full stack (server + client)
├── docker-compose.clients.yml   # Clients only
└── setup-local.sh               # Local dev setup script
```

---

## Quick Start — Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- OpenSSL (for TLS certs)

### 1. Clone and set up

```bash
git clone https://github.com/maldos23/remote-conector.git
cd remote-conector
```

### 2. Generate TLS certificates

```bash
bash scripts/gen-certs-local.sh
# Generates shared/certs/server.crt + server.key
```

### 3. Generate a client token

```bash
python3 scripts/gen-client-token.py --client-id local-client-1
# Outputs: CLIENT_TOKEN=eyJ...
```

### 4. Start with Docker Compose

```bash
# Full stack (server + 1 client)
docker-compose up --build

# Server only
docker-compose up --build server

# Additional clients
CLIENT_ID=client-2 CLIENT_TOKEN=<token> \
  docker-compose -f docker-compose.clients.yml up --build
```

### 5. Access the dashboard

Open http://localhost:8000 and log in:

- **User**: value of `MATCHA_USER` env var (default: `admin`)
- **Password**: value of `MATCHA_PASSWORD` env var (default: `changeme`)

---

## Environment Variables

### Server

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | *(required)* | Shared secret for signing JWTs (HS256) |
| `MATCHA_USER` | `admin` | Dashboard admin username |
| `MATCHA_PASSWORD` | `changeme` | Dashboard admin password |
| `HTTP_PORT` | `8000` | FastAPI HTTP port |
| `WS_PORT` | `8443` | WebSocket WSS port |
| `TLS_CERT_PATH` | *(required)* | Path to TLS certificate |
| `TLS_KEY_PATH` | *(required)* | Path to TLS private key |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

### Client

| Variable | Default | Description |
|---|---|---|
| `WS_URL` | *(required)* | `wss://server-host:8443` |
| `CLIENT_TOKEN` | *(required)* | JWT token (type `client`, 30d expiry) |
| `CLIENT_ID` | auto-generated | Persistent client identifier |
| `HTTP_PORT` | `8000` | Port to expose for the client HTTP API |
| `TLS_CA_CERT_PATH` | *(optional)* | CA cert for self-signed certs — **local only, do not set on GCloud** |

---

## API Reference

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{"username": "admin", "password": "changeme"}
```

Response: `{"access_token": "eyJ...", "token_type": "bearer"}`

All subsequent requests require: `Authorization: Bearer <access_token>`

### Clients

```http
GET  /api/clients              # List connected clients with ip:port and metrics
GET  /api/clients/{id}         # Client details
GET  /api/clients/{id}/metrics # Metrics history (CPU, RAM, disk)
POST /api/clients/provision    # Generate a new client JWT token
     Body: {"client_id": "my-node"}
```

### Commands

```http
POST /api/commands/run
Content-Type: application/json

{"client_id": "my-node", "command": "uptime"}
```

Response: `{"output": "...", "exit_code": 0, "command_id": "uuid"}`

---

## Adding a New Client Node

1. Go to the dashboard and click **Add Client**
2. Enter a client ID and click **Generate Token**
3. Follow the install instructions (3 tabs available):

**Docker run:**
```bash
docker run -d \
  --name my-node \
  --restart=always \
  -p 8000:8000 \
  -v /opt/client-data:/app/data \
  -e WS_URL=wss://<server-ip>:8443 \
  -e CLIENT_TOKEN=<token> \
  -e CLIENT_ID=my-node \
  -e HTTP_PORT=8000 \
  my-client-image:latest
```

> **Note:** Ensure `/opt/client-data` is owned by UID 999: `sudo chown -R 999:999 /opt/client-data`

---

## GCloud Deployment

See [scripts/gcloud-deploy.sh](scripts/gcloud-deploy.sh) for full deployment automation.

**Infrastructure:**
- Project: `labs-488820`, Zone: `us-central1-a`, Machine: `e2-small` (Debian 12)
- Server VM: ports 8000 + 8443 open in firewall
- Client VMs: port 8000 open per node

**Key deployment rules:**
1. `docker restart` does NOT swap images — always: `docker stop <name> && docker rm <name> && docker run ...`
2. `/app/data` on client VMs must be owned by UID 999: `sudo chown -R 999:999 /app/data`
3. Do NOT set `TLS_CA_CERT_PATH` on GCloud clients (cert SAN mismatch with public IP)
4. Regenerate client tokens if containers are recreated: `POST /api/clients/provision`

**Rebuild server after code changes:**
```bash
gcloud compute ssh matcha-server --zone=us-central1-a --project=labs-488820 \
  --command='sudo git -C /opt/matcha-cloud pull origin main && \
  sudo docker build -f /opt/matcha-cloud/server/Dockerfile -t matcha-server:latest /opt/matcha-cloud && \
  sudo docker stop matcha-server && sudo docker rm matcha-server && \
  sudo docker run -d --name matcha-server --restart=always -p 8000:8000 -p 8443:8443 \
    -v /run/secrets:/run/secrets:ro \
    -e TLS_CERT_PATH=/run/secrets/server.crt \
    -e TLS_KEY_PATH=/run/secrets/server.key \
    -e JWT_SECRET=<your-secret> \
    -e MATCHA_USER=<user> -e MATCHA_PASSWORD=<pass> \
    -e HTTP_PORT=8000 -e WS_PORT=8443 -e CORS_ORIGINS="*" \
    matcha-server:latest'
```

---

## Authentication Strategy

Two distinct JWT token types signed with `JWT_SECRET` (HS256):

| Type | Expiry | Used by | Validated on |
|---|---|---|---|
| `access` | 24 hours | Dashboard users | REST API (JWT middleware) |
| `client` | 30 days | Client nodes | WebSocket auth handshake |

The server rejects `access` tokens on the WebSocket endpoint and `client` tokens on REST routes.

---

## Metric Alerts

Thresholds applied to CPU, RAM and Disk:

| Level | Threshold |
|---|---|
| Warning | > 75% |
| Critical | > 90% |

Alerts appear as banners in the dashboard header when any client crosses a threshold.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend HTTP | FastAPI + uvicorn |
| WebSocket | Python `websockets` (native, TLS) |
| Auth | PyJWT (HS256) |
| Frontend | React 18 + Vite 5 + TypeScript |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| Charts | Recharts |
| Containers | Docker + Docker Compose |
| Infrastructure | Google Cloud Platform |

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Client shows disconnected after server restart | Normal — reconnects automatically | Wait up to 5 min or restart client container |
| `Invalid token` on client auth | Token expired or wrong `JWT_SECRET` | Re-provision via `POST /api/clients/provision` |
| `AttributeError: module 'websockets'` | New websockets version requires explicit import | Add `import websockets.exceptions` at top of file |
| `SSL CERTIFICATE_VERIFY_FAILED` | Self-signed cert SAN mismatch on GCloud | Remove `TLS_CA_CERT_PATH` from client env |
| Permission denied on `/app/data/client_id.txt` | Bind mount owned by root | `sudo chown -R 999:999 /app/data` |

---

## Documentation

- [Architecture](doc/ARCHITECTURE.md)
- [Docker Guide](doc/DOCKER.md)
- [Examples](doc/EXAMPLES.md)

## License

This project is provided as-is for educational and development purposes.
