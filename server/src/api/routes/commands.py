"""
Command routes — POST /api/commands/{client_id}, POST /api/commands/broadcast
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from server.src.core.client_registry import registry
from server.src.core.command_dispatcher import send_command, broadcast_command, build_activity_entry
from server.src.api.middleware.jwt_middleware import require_auth

router = APIRouter()


class CommandRequest(BaseModel):
    command: str
    timeout: Optional[int] = 30


@router.post("/{client_id}")
async def run_command(
    client_id: str,
    body: CommandRequest,
    user: str = Depends(require_auth),
) -> dict:
    info = registry.get(client_id)
    if not info:
        raise HTTPException(status_code=404, detail="Client not connected")

    cmd_id = str(uuid.uuid4())
    result = await send_command(info.ws, body.command, command_id=cmd_id, timeout=body.timeout)

    entry = build_activity_entry(body.command, cmd_id, sent_by=user, response=result)
    await registry.record_activity(client_id, entry)

    return {"client_id": client_id, "command_id": cmd_id, "result": result}


@router.post("/broadcast/all")
async def broadcast(
    body: CommandRequest,
    user: str = Depends(require_auth),
) -> dict:
    clients = registry.all()
    if not clients:
        raise HTTPException(status_code=404, detail="No clients connected")

    results = await broadcast_command(clients, body.command, timeout=body.timeout)

    for client_id, result in results.items():
        cmd_id = result.get("command_id", str(uuid.uuid4()))
        entry = build_activity_entry(body.command, cmd_id, sent_by=user, response=result)
        await registry.record_activity(client_id, entry)

    return {"broadcast": True, "results": results}
