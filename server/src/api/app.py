"""
FastAPI application — matcha-cloud server dashboard.
Serves the React frontend as static files and exposes the REST + WebSocket API.
"""
import asyncio
import json
import logging
import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.src.api.routes import auth, clients, commands
from server.src.api.middleware.jwt_middleware import require_auth
from server.src.core.client_registry import registry

logger = logging.getLogger("matcha.api")

STATIC_DIR = Path(__file__).parent.parent.parent / "web" / "dist"


def create_app() -> FastAPI:
    app = FastAPI(
        title="matcha-cloud",
        description="Remote process management dashboard",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    # CORS — allow the Vite dev server during development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # REST routes
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
    app.include_router(commands.router, prefix="/api/commands", tags=["commands"])

    # Dashboard WebSocket: browser subscribes here for real-time events
    @app.websocket("/ws/dashboard")
    async def dashboard_ws(ws: WebSocket) -> None:
        await ws.accept()

        # Validate token sent as query param ?token=<jwt>
        token = ws.query_params.get("token", "")
        from shared.auth import verify_access_token
        username = verify_access_token(token)
        if not username:
            await ws.close(code=4001, reason="Unauthorized")
            return

        # Push current state on connect
        await ws.send_json({
            "type": "dashboard_update",
            "event": "initial_state",
            "payload": {"clients": registry.all_as_dicts()},
        })

        # Register callback that forwards events to this browser
        async def push_event(event: str, payload: dict) -> None:
            try:
                await ws.send_json({
                    "type": "dashboard_update",
                    "event": event,
                    "payload": payload,
                })
            except Exception:
                pass

        registry.subscribe(push_event)

        try:
            while True:
                data = await ws.receive_text()
                # Browser can send ping
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "ping":
                        await ws.send_json({"type": "pong"})
                except Exception:
                    pass
        except WebSocketDisconnect:
            pass
        finally:
            registry.unsubscribe(push_event)

    # Health check
    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok", "clients_connected": registry.count()}

    # Serve React build (must be last to not shadow API routes)
    if STATIC_DIR.exists():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def spa_fallback(full_path: str) -> FileResponse:
            index = STATIC_DIR / "index.html"
            return FileResponse(str(index))
    else:
        logger.warning("Frontend build not found at %s — API-only mode", STATIC_DIR)

    return app


app = create_app()
