"""
Command Dispatcher — matcha-cloud server.
Sends commands to one or all connected clients and tracks responses.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("matcha.dispatcher")

# Pending responses: command_id -> asyncio.Future
_pending: dict[str, asyncio.Future] = {}
_pending_lock = asyncio.Lock()


async def send_command(
    ws,
    command: str,
    command_id: Optional[str] = None,
    timeout: Optional[int] = 30,
) -> dict:
    """
    Send a command to a single client WebSocket.
    Returns the response dict or a timeout/error dict.
    """
    cmd_id = command_id or str(uuid.uuid4())
    message = json.dumps({
        "type": "command",
        "command_id": cmd_id,
        "command": command,
        "timeout": timeout,
    })

    loop = asyncio.get_event_loop()
    future: asyncio.Future = loop.create_future()

    async with _pending_lock:
        _pending[cmd_id] = future

    try:
        await ws.send(message)
        result = await asyncio.wait_for(future, timeout=timeout + 5 if timeout else 60)
        return result
    except asyncio.TimeoutError:
        logger.warning("Command %s timed out", cmd_id)
        return {
            "command_id": cmd_id,
            "status": "timeout",
            "output": "",
            "error": "Command timed out",
            "exit_code": -1,
        }
    except Exception as exc:
        logger.error("Command %s error: %s", cmd_id, exc)
        return {
            "command_id": cmd_id,
            "status": "error",
            "output": "",
            "error": str(exc),
            "exit_code": -1,
        }
    finally:
        async with _pending_lock:
            _pending.pop(cmd_id, None)


async def broadcast_command(
    clients: list,
    command: str,
    timeout: Optional[int] = 30,
) -> dict[str, dict]:
    """
    Broadcast a command to all clients in parallel.
    Returns mapping of client_id -> response.
    """
    tasks = {
        c.client_id: asyncio.create_task(
            send_command(c.ws, command, timeout=timeout)
        )
        for c in clients
    }
    results = {}
    for client_id, task in tasks.items():
        try:
            results[client_id] = await task
        except Exception as exc:
            results[client_id] = {
                "status": "error",
                "output": "",
                "error": str(exc),
                "exit_code": -1,
            }
    return results


async def resolve_response(response: dict) -> None:
    """
    Called by ws_server when a response message arrives from a client.
    Resolves the pending Future for the corresponding command_id.
    """
    cmd_id = response.get("command_id")
    if not cmd_id:
        return
    async with _pending_lock:
        future = _pending.get(cmd_id)
    if future and not future.done():
        future.set_result(response)


def build_activity_entry(
    command: str,
    command_id: str,
    sent_by: str,
    response: Optional[dict] = None,
) -> dict:
    return {
        "command_id": command_id,
        "command": command,
        "sent_by": sent_by,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "response": response,
    }
