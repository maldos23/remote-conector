"""
Client status API — minimal FastAPI app that serves the client status page.
"""
import os
import socket
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from client.src.core.metrics_collector import collect_snapshot

STATIC_DIR = Path(__file__).parent.parent.parent / "web" / "dist"

CLIENT_ID_FILE = Path(os.getenv("CLIENT_ID_FILE", "/app/data/client_id.txt"))
SERVER_URI = os.getenv("SERVER_URI", "wss://localhost:8443")


def _get_client_id() -> str:
    if CLIENT_ID_FILE.exists():
        return CLIENT_ID_FILE.read_text().strip()
    return "unknown"


def create_app() -> FastAPI:
    app = FastAPI(title="matcha-cloud client", docs_url="/api/docs")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/status")
    async def status() -> dict:
        client_id = _get_client_id()
        metrics = collect_snapshot(client_id)
        return {
            "client_id": client_id,
            "hostname": socket.gethostname(),
            "ip": socket.gethostbyname(socket.gethostname()),
            "server_uri": SERVER_URI,
            "metrics": metrics,
        }

    @app.get("/api/health")
    async def health() -> dict:
        return {"status": "ok"}

    if STATIC_DIR.exists():
        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def spa(full_path: str) -> FileResponse:
            return FileResponse(str(STATIC_DIR / "index.html"))
    
    return app


app = create_app()
