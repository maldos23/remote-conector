"""
Metrics Collector — matcha-cloud client.
Collects system resource metrics using psutil.
"""
import asyncio
import datetime
import logging
import socket

import psutil

logger = logging.getLogger("matcha.metrics")


def collect_snapshot(client_id: str) -> dict:
    """Collect a single metrics snapshot and return it as a dict."""
    try:
        cpu = psutil.cpu_percent(interval=0.5)
    except Exception:
        cpu = 0.0

    try:
        ram = psutil.virtual_memory()
        ram_percent = ram.percent
        ram_used_mb = ram.used / 1024 / 1024
        ram_total_mb = ram.total / 1024 / 1024
    except Exception:
        ram_percent = ram_used_mb = ram_total_mb = 0.0

    try:
        disk = psutil.disk_usage("/")
        disk_percent = disk.percent
        disk_used_gb = disk.used / 1024 / 1024 / 1024
        disk_total_gb = disk.total / 1024 / 1024 / 1024
    except Exception:
        disk_percent = disk_used_gb = disk_total_gb = 0.0

    try:
        hostname = socket.gethostname()
    except Exception:
        hostname = "unknown"

    return {
        "type": "metrics",
        "client_id": client_id,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "hostname": hostname,
        "cpu_percent": round(cpu, 1),
        "ram_percent": round(ram_percent, 1),
        "ram_used_mb": round(ram_used_mb, 1),
        "ram_total_mb": round(ram_total_mb, 1),
        "disk_percent": round(disk_percent, 1),
        "disk_used_gb": round(disk_used_gb, 2),
        "disk_total_gb": round(disk_total_gb, 2),
    }


async def metrics_loop(client_id: str, send_fn, interval: float = 5.0) -> None:
    """
    Continuously collect and send metrics via send_fn.
    send_fn is an async callable that accepts a dict.
    """
    logger.info("Metrics loop started (interval=%.1fs)", interval)
    while True:
        try:
            snapshot = collect_snapshot(client_id)
            await send_fn(snapshot)
        except Exception as exc:
            logger.warning("Metrics collection error: %s", exc)
        await asyncio.sleep(interval)
