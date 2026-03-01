"""
Client routes — GET /api/clients, GET /api/clients/{id}, etc.
"""
from fastapi import APIRouter, HTTPException, Depends

from server.src.core.client_registry import registry
from server.src.api.middleware.jwt_middleware import require_auth

router = APIRouter()


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
