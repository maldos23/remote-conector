"""
Process Runner — matcha-cloud client.
Executes shell commands received from the server and returns structured results.
"""
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("matcha.runner")


async def run_command(command: str, timeout: int | None = 30) -> dict:
    """
    Execute a shell command asynchronously.
    Returns a structured result dict compatible with ResponseMessage.
    """
    logger.info("Executing: %s (timeout=%s)", command[:80], timeout)
    try:
        proc = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(),
                timeout=float(timeout) if timeout else None,
            )
        except asyncio.TimeoutError:
            proc.kill()
            await proc.communicate()
            return {
                "status": "timeout",
                "output": "",
                "error": f"Command timed out after {timeout}s",
                "exit_code": -1,
            }

        return {
            "status": "success" if proc.returncode == 0 else "error",
            "output": stdout.decode(errors="replace").strip(),
            "error": stderr.decode(errors="replace").strip(),
            "exit_code": proc.returncode,
        }

    except Exception as exc:
        logger.error("Command execution failed: %s", exc)
        return {
            "status": "error",
            "output": "",
            "error": str(exc),
            "exit_code": -1,
        }
