"""
Client Registry — matcha-cloud server.
Tracks all connected WebSocket clients with their metadata and metrics history.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Callable, Awaitable
from collections import deque

from websockets import WebSocketServerProtocol

logger = logging.getLogger("matcha.registry")

MAX_METRICS_HISTORY = 60   # last 60 data points (~5 min at 5s interval)
MAX_LOG_HISTORY = 500      # last 500 log lines per client


@dataclass
class ClientInfo:
    client_id: str
    ws: WebSocketServerProtocol
    ip: str
    hostname: str
    connected_at: datetime
    last_seen: datetime
    authenticated: bool = False

    # Rolling history
    metrics_history: deque = field(default_factory=lambda: deque(maxlen=MAX_METRICS_HISTORY))
    log_history: deque = field(default_factory=lambda: deque(maxlen=MAX_LOG_HISTORY))
    activity_log: list = field(default_factory=list)   # commands sent + responses

    # Latest metrics snapshot
    latest_metrics: Optional[dict] = None


# Callback type: async fn(event_type, payload)
DashboardCallback = Callable[[str, dict], Awaitable[None]]


class ClientRegistry:
    """
    Thread-safe (asyncio) registry of connected client nodes.
    Fires callbacks whenever state changes so the dashboard WebSocket can push updates.
    """

    def __init__(self) -> None:
        self._clients: dict[str, ClientInfo] = {}
        self._lock = asyncio.Lock()
        self._callbacks: list[DashboardCallback] = []

    # ── Subscription ─────────────────────────────────────────────────────────

    def subscribe(self, callback: DashboardCallback) -> None:
        """Register a callback to receive all state-change events."""
        self._callbacks.append(callback)

    def unsubscribe(self, callback: DashboardCallback) -> None:
        self._callbacks = [c for c in self._callbacks if c != callback]

    async def _emit(self, event: str, payload: dict) -> None:
        """Fire all registered callbacks with the event."""
        for cb in list(self._callbacks):
            try:
                await cb(event, payload)
            except Exception as exc:
                logger.warning("Dashboard callback error: %s", exc)

    # ── Client lifecycle ──────────────────────────────────────────────────────

    async def register(
        self,
        client_id: str,
        ws: WebSocketServerProtocol,
        ip: str,
        hostname: str,
    ) -> ClientInfo:
        now = datetime.now(timezone.utc)
        info = ClientInfo(
            client_id=client_id,
            ws=ws,
            ip=ip,
            hostname=hostname,
            connected_at=now,
            last_seen=now,
            authenticated=True,
        )
        async with self._lock:
            self._clients[client_id] = info
        logger.info("Client registered: %s @ %s (%s)", client_id, ip, hostname)
        await self._emit("client_connected", self._serialize(info))
        return info

    async def unregister(self, client_id: str) -> None:
        async with self._lock:
            info = self._clients.pop(client_id, None)
        if info:
            logger.info("Client disconnected: %s", client_id)
            await self._emit("client_disconnected", {"client_id": client_id})

    def get(self, client_id: str) -> Optional[ClientInfo]:
        return self._clients.get(client_id)

    def all(self) -> list[ClientInfo]:
        return list(self._clients.values())

    def count(self) -> int:
        return len(self._clients)

    # ── Updates ───────────────────────────────────────────────────────────────

    async def update_metrics(self, client_id: str, metrics: dict) -> None:
        info = self._clients.get(client_id)
        if not info:
            return
        info.latest_metrics = metrics
        info.last_seen = datetime.now(timezone.utc)
        info.metrics_history.append(metrics)
        await self._emit("metrics", {"client_id": client_id, "metrics": metrics})

    async def add_log(self, client_id: str, log: dict) -> None:
        info = self._clients.get(client_id)
        if not info:
            return
        info.log_history.append(log)
        await self._emit("log", {"client_id": client_id, "log": log})

    async def add_alert(self, client_id: str, alert: dict) -> None:
        await self._emit("alert", {"client_id": client_id, "alert": alert})

    async def record_activity(self, client_id: str, entry: dict) -> None:
        info = self._clients.get(client_id)
        if not info:
            return
        info.activity_log.append(entry)
        await self._emit("activity", {"client_id": client_id, "entry": entry})

    # ── Serialization ─────────────────────────────────────────────────────────

    @staticmethod
    def _serialize(info: ClientInfo) -> dict:
        return {
            "client_id": info.client_id,
            "ip": info.ip,
            "hostname": info.hostname,
            "connected": True,
            "connected_at": info.connected_at.isoformat(),
            "last_seen": info.last_seen.isoformat(),
            "latest_metrics": info.latest_metrics,
        }

    def to_dict(self, client_id: str) -> Optional[dict]:
        info = self._clients.get(client_id)
        if not info:
            return None
        return self._serialize(info)

    def all_as_dicts(self) -> list[dict]:
        return [self._serialize(c) for c in self._clients.values()]


# Singleton instance shared across server components
registry = ClientRegistry()
