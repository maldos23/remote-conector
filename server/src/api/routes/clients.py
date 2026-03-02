"""
Client routes — GET /api/clients, GET /api/clients/{id}, etc.
"""
import os
import uuid
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from server.src.core.client_registry import registry
from server.src.api.middleware.jwt_middleware import require_auth
from shared.auth import create_client_token

router = APIRouter()


class ProvisionResponse(BaseModel):
    client_id: str
    token: str
    expires_days: int = 30
    ws_port: int
    http_port: int


@router.post("/provision", response_model=ProvisionResponse)
async def provision_client(user: str = Depends(require_auth)) -> ProvisionResponse:
    """
    Generate a new client_id + JWT token so a new client node can connect.
    The caller gets the token and can use it to run the client container.
    """
    client_id = str(uuid.uuid4())
    token = create_client_token(client_id)
    return ProvisionResponse(
        client_id=client_id,
        token=token,
        expires_days=30,
        ws_port=int(os.getenv("WS_PORT", "8443")),
        http_port=int(os.getenv("HTTP_PORT", "8000")),
    )


@router.get("")
async def list_clients(user: str = Depends(require_auth)) -> list[dict]:
    """Return all currently connected clients."""
    return registry.all_as_dicts()


@router.get("/{client_id}")
async def get_client(client_id: str, user: str = Depends(require_auth)) -> dict:
    data = registry.to_dict(client_id)
    if not data:
        raise HTTPException(status_code=404, detail="Client not found")
    return data


@router.get("/{client_id}/logs")
async def get_logs(client_id: str, limit: int = 200, user: str = Depends(require_auth)) -> dict:
    info = registry.get(client_id)
    if not info:
        raise HTTPException(status_code=404, detail="Client not found")
    logs = list(info.log_history)[-limit:]
    return {"client_id": client_id, "logs": logs}


@router.get("/{client_id}/metrics")
async def get_metrics(client_id: str, user: str = Depends(require_auth)) -> dict:
    info = registry.get(client_id)
    if not info:
        raise HTTPException(status_code=404, detail="Client not found")
    return {
        "client_id": client_id,
        "latest": info.latest_metrics,
        "history": list(info.metrics_history),
    }


@router.get("/{client_id}/activity")
async def get_activity(client_id: str, limit: int = 100, user: str = Depends(require_auth)) -> dict:
    info = registry.get(client_id)
    if not info:
        raise HTTPException(status_code=404, detail="Client not found")
    return {
        "client_id": client_id,
        "activity": info.activity_log[-limit:],
    }
