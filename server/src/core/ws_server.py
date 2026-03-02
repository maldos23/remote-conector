"""
WebSocket Server (WSS) — matcha-cloud.
Accepts client connections, performs JWT auth handshake, dispatches messages.
"""
import asyncio
import json
import logging
import os
import ssl
from datetime import datetime, timezone

import websockets
from websockets import WebSocketServerProtocol

from shared.auth import verify_client_token, create_client_token
from shared.messages import ALERT_THRESHOLDS
from server.src.core.client_registry import registry
from server.src.core.command_dispatcher import resolve_response

logger = logging.getLogger("matcha.ws_server")

HOST: str = os.getenv("WS_HOST", "0.0.0.0")
PORT: int = int(os.getenv("WS_PORT", "8443"))


def _build_ssl_context() -> ssl.SSLContext | None:
    cert = os.getenv("TLS_CERT_PATH")
    key = os.getenv("TLS_KEY_PATH")
    if not cert or not key:
        logger.warning("TLS_CERT_PATH / TLS_KEY_PATH not set — running without TLS (ws://)")
        return None
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(cert, key)
    logger.info("TLS loaded: cert=%s", cert)
    return ctx


async def _authenticate(ws: WebSocketServerProtocol) -> dict | None:
    """
    Perform the auth handshake.
    Client must send {"type":"auth","token":"<jwt>","client_id":"<uuid>",...} within 10s.
    Returns {client_id, hostname, http_port} on success or None on failure.
    """
    try:
        raw = await asyncio.wait_for(ws.recv(), timeout=10.0)
    except asyncio.TimeoutError:
        await ws.send(json.dumps({"type": "auth_ack", "status": "error", "message": "Auth timeout"}))
        return None

    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        await ws.send(json.dumps({"type": "auth_ack", "status": "error", "message": "Invalid JSON"}))
        return None

    if msg.get("type") != "auth":
        await ws.send(json.dumps({"type": "auth_ack", "status": "error", "message": "Expected auth message"}))
        return None

    token = msg.get("token", "")
    client_id = msg.get("client_id", "")

    verified_id = verify_client_token(token)
    if not verified_id:
        await ws.send(json.dumps({"type": "auth_ack", "status": "error", "message": "Invalid token"}))
        logger.warning("Auth failed for client_id=%s from %s", client_id, ws.remote_address)
        return None

    # Use the client_id provided by the client (not the token sub), so multiple
    # clients can share the same token while having distinct identities.
    effective_id = client_id if client_id else verified_id

    await ws.send(json.dumps({"type": "auth_ack", "status": "ok", "message": "Authenticated"}))
    return {
        "client_id": effective_id,
        "hostname": msg.get("hostname") or f"client-{effective_id[:8]}",
        "http_port": int(msg.get("http_port") or 8000),
    }


async def _check_alerts(client_id: str, metrics: dict) -> None:
    """Emit alert events when metrics exceed thresholds."""
    now = datetime.now(timezone.utc).isoformat()
    for resource, key in [("cpu", "cpu_percent"), ("ram", "ram_percent"), ("disk", "disk_percent")]:
        value = metrics.get(key)
        if value is None:
            continue
        thresholds = ALERT_THRESHOLDS[resource]
        if value >= thresholds["critical"]:
            await registry.add_alert(client_id, {
                "timestamp": now, "severity": "critical",
                "resource": resource, "value": value,
                "threshold": thresholds["critical"],
                "message": f"{resource.upper()} critical: {value:.1f}% (threshold {thresholds['critical']}%)",
            })
        elif value >= thresholds["warning"]:
            await registry.add_alert(client_id, {
                "timestamp": now, "severity": "warning",
                "resource": resource, "value": value,
                "threshold": thresholds["warning"],
                "message": f"{resource.upper()} warning: {value:.1f}% (threshold {thresholds['warning']}%)",
            })


async def _handle_message(client_id: str, raw: str) -> None:
    """Route an incoming message to the correct handler."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Malformed JSON from %s", client_id)
        return

    msg_type = msg.get("type")

    if msg_type == "response":
        await resolve_response(msg)
        # Record activity
        await registry.record_activity(client_id, {
            "type": "response",
            "command_id": msg.get("command_id"),
            "status": msg.get("status"),
            "output": msg.get("output", "")[:2000],  # truncate for storage
            "exit_code": msg.get("exit_code"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    elif msg_type == "metrics":
        await registry.update_metrics(client_id, msg)
        await _check_alerts(client_id, msg)

    elif msg_type == "log":
        await registry.add_log(client_id, msg)

    elif msg_type == "pong":
        info = registry.get(client_id)
        if info:
            info.last_seen = datetime.now(timezone.utc)

    else:
        logger.debug("Unknown message type '%s' from %s", msg_type, client_id)


async def handle_client(ws: WebSocketServerProtocol) -> None:
    """Main handler for each WebSocket connection."""
    remote = ws.remote_address
    logger.info("Incoming connection from %s", remote)

    # Auth handshake
    auth = await _authenticate(ws)
    if not auth:
        await ws.close(4001, "Unauthorized")
        return

    client_id = auth["client_id"]
    hostname = auth["hostname"]
    http_port = auth["http_port"]

    # Register client
    ip = remote[0] if remote else "unknown"
    info = await registry.register(client_id, ws, ip, hostname, http_port)

    logger.info("Client authenticated: %s @ %s (port %d)", client_id, ip, http_port)

    try:
        async for raw in ws:
            await _handle_message(client_id, raw)
    except websockets.exceptions.ConnectionClosedOK:
        pass
    except websockets.exceptions.ConnectionClosedError as exc:
        logger.warning("Client %s closed with error: %s", client_id, exc)
    finally:
        await registry.unregister(client_id)


async def start_ws_server() -> None:
    """Start the WebSocket server. Called from main.py."""
    ssl_ctx = _build_ssl_context()
    proto = "wss" if ssl_ctx else "ws"

    async with websockets.serve(
        handle_client,
        HOST,
        PORT,
        ssl=ssl_ctx,
        ping_interval=20,
        ping_timeout=60,
        max_size=10 * 1024 * 1024,  # 10 MB max message
    ):
        logger.info("matcha-cloud WS server listening on %s://%s:%d", proto, HOST, PORT)
        await asyncio.Future()  # run forever
