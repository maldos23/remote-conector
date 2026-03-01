"""
Client entrypoint — start WebSocket client and HTTP status API concurrently.
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
logger = logging.getLogger("matcha.client")


async def main() -> None:
    from client.src.core.ws_client import run_with_reconnect
    from client.src.api.app import app

    http_port = int(os.getenv("HTTP_PORT", "8001"))

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=http_port,
        log_level="warning",
    )
    http_server = uvicorn.Server(config)

    logger.info("Starting matcha-cloud client...")

    await asyncio.gather(
        run_with_reconnect(),
        http_server.serve(),
    )


if __name__ == "__main__":
    asyncio.run(main())
