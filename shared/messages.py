"""
Shared message protocol definitions for matcha-cloud.
All WebSocket messages between server <-> client use these TypedDicts.
"""
from typing import TypedDict, Optional, Literal, List


# ── Auth ──────────────────────────────────────────────────────────────────────

class AuthMessage(TypedDict):
    type: Literal["auth"]
    token: str          # JWT signed with JWT_SECRET
    client_id: str      # UUID persistent per client instance


class AuthAckMessage(TypedDict):
    type: Literal["auth_ack"]
    status: Literal["ok", "error"]
    message: str


# ── Commands ──────────────────────────────────────────────────────────────────

class CommandMessage(TypedDict):
    type: Literal["command"]
    command_id: str     # UUID for tracking individual commands
    command: str        # shell string to execute
    timeout: Optional[int]  # seconds, None = no timeout


class ResponseMessage(TypedDict):
    type: Literal["response"]
    command_id: str
    status: Literal["success", "error", "timeout"]
    output: str         # stdout
    error: str          # stderr
    exit_code: int


# ── Metrics ───────────────────────────────────────────────────────────────────

class MetricsMessage(TypedDict):
    type: Literal["metrics"]
    client_id: str
    timestamp: str      # ISO 8601
    cpu_percent: float
    ram_percent: float
    ram_used_mb: float
    ram_total_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float


# ── Logs ──────────────────────────────────────────────────────────────────────

class LogMessage(TypedDict):
    type: Literal["log"]
    client_id: str
    timestamp: str
    level: Literal["INFO", "WARN", "ERROR", "DEBUG"]
    message: str


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertMessage(TypedDict):
    type: Literal["alert"]
    client_id: str
    timestamp: str
    severity: Literal["warning", "critical"]
    resource: Literal["cpu", "ram", "disk"]
    value: float
    threshold: float
    message: str


# ── Client Status ─────────────────────────────────────────────────────────────

class ClientStatusMessage(TypedDict):
    type: Literal["client_status"]
    client_id: str
    ip: str
    hostname: str
    connected: bool
    connected_at: Optional[str]
    last_seen: Optional[str]


# ── Ping / Pong ───────────────────────────────────────────────────────────────

class PingMessage(TypedDict):
    type: Literal["ping"]
    timestamp: str


class PongMessage(TypedDict):
    type: Literal["pong"]
    timestamp: str


# ── Dashboard push (server → browser) ────────────────────────────────────────

class DashboardUpdateMessage(TypedDict):
    type: Literal["dashboard_update"]
    event: Literal["client_connected", "client_disconnected", "metrics", "log", "alert", "response"]
    payload: dict


# Type alias for all valid message types
AnyMessage = (
    AuthMessage | AuthAckMessage | CommandMessage | ResponseMessage |
    MetricsMessage | LogMessage | AlertMessage | ClientStatusMessage |
    PingMessage | PongMessage | DashboardUpdateMessage
)

# Alert thresholds (default)
ALERT_THRESHOLDS = {
    "cpu": {"warning": 75.0, "critical": 90.0},
    "ram": {"warning": 80.0, "critical": 95.0},
    "disk": {"warning": 85.0, "critical": 95.0},
}
