"""
Server entrypoint — start both the WebSocket server and the HTTP API concurrently.
"""
import asyncio
import logging
import os

import uvicorn
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("matcha.main")


async def main() -> None:
    from server.src.core.ws_server import start_ws_server
    from server.src.api.app import app

    http_host = os.getenv("HTTP_HOST", "0.0.0.0")
    http_port = int(os.getenv("HTTP_PORT", "8000"))

    config = uvicorn.Config(
        app,
        host=http_host,
        port=http_port,
        log_level="info",
        access_log=True,
    )
    http_server = uvicorn.Server(config)

    logger.info("Starting matcha-cloud server...")

    await asyncio.gather(
        start_ws_server(),
        http_server.serve(),
    )


if __name__ == "__main__":
    asyncio.run(main())
