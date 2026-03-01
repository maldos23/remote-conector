"""
WebSocket Client (WSS) — matcha-cloud client.
Connects to the server with JWT auth, receives commands, sends metrics.
Implements exponential back-off reconnection.
"""
import asyncio
import json
import logging
import os
import socket
import ssl
import uuid
from pathlib import Path

import websockets
from dotenv import load_dotenv

from client.src.core.metrics_collector import metrics_loop
from client.src.core.process_runner import run_command

load_dotenv()
logger = logging.getLogger("matcha.ws_client")

CLIENT_ID_FILE = Path(os.getenv("CLIENT_ID_FILE", "/app/data/client_id.txt"))
SERVER_URI = os.getenv("SERVER_URI", "wss://localhost:8443")
CLIENT_TOKEN = os.getenv("CLIENT_TOKEN", "")  # JWT issued by server admin / gcloud script
TLS_CA_CERT = os.getenv("TLS_CA_CERT_PATH")   # path to server's CA cert for verification

BACKOFF_BASE = 1.0      # seconds
BACKOFF_MAX = 30.0      # seconds
BACKOFF_FACTOR = 2.0    # exponential multiplier


def _get_or_create_client_id() -> str:
    """Persist a stable UUID so this client keeps its identity across restarts."""
    CLIENT_ID_FILE.parent.mkdir(parents=True, exist_ok=True)
    if CLIENT_ID_FILE.exists():
        cid = CLIENT_ID_FILE.read_text().strip()
        if cid:
            return cid
    cid = str(uuid.uuid4())
    CLIENT_ID_FILE.write_text(cid)
    logger.info("Created new client_id: %s", cid)
    return cid


def _build_ssl_context() -> ssl.SSLContext | None:
    """Build SSL context for wss:// connections."""
    if not SERVER_URI.startswith("wss://"):
        return None
    ctx = ssl.create_default_context()
    if TLS_CA_CERT:
        # Verify server cert against our CA (self-signed in GCloud)
        ctx.load_verify_locations(TLS_CA_CERT)
    else:
        # Dev fallback: skip hostname/cert verification
        logger.warning("TLS_CA_CERT_PATH not set — disabling cert verification (dev only)")
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    return ctx


async def _authenticate(ws) -> bool:
    """Send auth message and wait for ack."""
    if not CLIENT_TOKEN:
        logger.error("CLIENT_TOKEN env var not set — cannot authenticate")
        return False

    client_id = _get_or_create_client_id()
    await ws.send(json.dumps({
        "type": "auth",
        "token": CLIENT_TOKEN,
        "client_id": client_id,
    }))

    try:
        raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
        ack = json.loads(raw)
        if ack.get("status") == "ok":
            logger.info("Authenticated with server (client_id=%s)", client_id)
            return True
        else:
            logger.error("Auth rejected: %s", ack.get("message"))
            return False
    except asyncio.TimeoutError:
        logger.error("Auth ack timeout")
        return False


async def _send_metrics(ws, client_id: str) -> None:
    """Wrapper to send metrics over the WebSocket."""
    async def _send(data: dict) -> None:
        try:
            await ws.send(json.dumps(data))
        except Exception as exc:
            logger.warning("Metrics send error: %s", exc)

    await metrics_loop(client_id, _send, interval=5.0)


async def _handle_messages(ws) -> None:
    """Main message receive loop."""
    client_id = _get_or_create_client_id()
    async for raw in ws:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Malformed JSON received")
            continue

        msg_type = msg.get("type")

        if msg_type == "command":
            cmd_id = msg.get("command_id", "")
            command = msg.get("command", "")
            timeout = msg.get("timeout", 30)
            logger.info("Received command [%s]: %s", cmd_id[:8], command[:60])

            result = await run_command(command, timeout=timeout)
            response = {
                "type": "response",
                "command_id": cmd_id,
                **result,
            }
            await ws.send(json.dumps(response))

        elif msg_type == "ping":
            await ws.send(json.dumps({"type": "pong", "timestamp": msg.get("timestamp", "")}))

        elif msg_type == "auth_ack":
            pass  # already handled in _authenticate

        else:
            logger.debug("Unknown message type: %s", msg_type)


async def connect_and_run() -> None:
    """Single connection attempt: authenticate then run message+metrics loops."""
    ssl_ctx = _build_ssl_context()
    client_id = _get_or_create_client_id()

    async with websockets.connect(
        SERVER_URI,
        ssl=ssl_ctx,
        ping_interval=20,
        ping_timeout=60,
    ) as ws:
        ok = await _authenticate(ws)
        if not ok:
            return

        # Run message handling and metrics collection in parallel
        await asyncio.gather(
            _handle_messages(ws),
            _send_metrics(ws, client_id),
        )


async def run_with_reconnect() -> None:
    """
    Run the client, reconnecting with exponential back-off on failure.
    This function never returns unless the process is killed.
    """
    delay = BACKOFF_BASE
    attempt = 0

    while True:
        attempt += 1
        logger.info("Connection attempt #%d to %s", attempt, SERVER_URI)
        try:
            await connect_and_run()
        except websockets.exceptions.InvalidStatus as exc:
            logger.error("Rejected by server (code %s) — retrying in %.1fs", exc.response.status_code, delay)
        except (OSError, websockets.exceptions.WebSocketException) as exc:
            logger.warning("Connection error: %s — retrying in %.1fs", exc, delay)
        except Exception as exc:
            logger.error("Unexpected error: %s — retrying in %.1fs", exc, delay)

        await asyncio.sleep(delay)
        delay = min(delay * BACKOFF_FACTOR, BACKOFF_MAX)
