#!/usr/bin/env python3
"""
gen-client-token.py — Generate a JWT token for a client node.
Usage: python3 scripts/gen-client-token.py

Set JWT_SECRET in your environment or .env before running.
"""
import os
import sys
import uuid
import datetime

try:
    import jwt
    from dotenv import load_dotenv
except ImportError:
    print("❌  Run: pip install PyJWT python-dotenv", file=sys.stderr)
    sys.exit(1)

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "matcha-cloud-dev-secret-change-me")
client_id = str(uuid.uuid4())
now = datetime.datetime.now(datetime.timezone.utc)

payload = {
    "sub": client_id,
    "type": "client",
    "iat": now,
    "exp": now + datetime.timedelta(days=720),  # 2 years
}

token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

print(f"CLIENT_ID={client_id}")
print(f"CLIENT_TOKEN={token}")
print()
print("Add CLIENT_TOKEN to the client's environment variables (.env or docker run -e).")
