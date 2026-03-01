"""
Authentication utilities for matcha-cloud.
JWT encoding/decoding and password hashing.
"""
import os
import datetime
import hashlib
import hmac
import base64
from typing import Optional

import jwt
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────

JWT_SECRET: str = os.getenv("JWT_SECRET", "matcha-cloud-secret-change-in-production")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))

# Default credentials (override via .env)
DEFAULT_USER: str = os.getenv("MATCHA_USER", "matcha")
DEFAULT_PASSWORD: str = os.getenv("MATCHA_PASSWORD", "m4tcha-cloud")

# Pre-hash the default password at import time so it's ready for comparisons
_DEFAULT_PASSWORD_HASH: bytes = bcrypt.hashpw(
    DEFAULT_PASSWORD.encode(), bcrypt.gensalt(rounds=12)
)

# Simple in-memory user store — extend with DB in production
_USERS: dict[str, bytes] = {
    DEFAULT_USER: _DEFAULT_PASSWORD_HASH,
}


# ── Password utilities ────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    hashed = bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12))
    return hashed.decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Compare plain-text password to its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── User store helpers ────────────────────────────────────────────────────────

def authenticate_user(username: str, password: str) -> bool:
    """
    Verify credentials against the user store.
    Returns True if the user exists and the password matches.
    """
    stored_hash = _USERS.get(username)
    if not stored_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode(), stored_hash)
    except Exception:
        return False


def add_user(username: str, plain_password: str) -> None:
    """Add or overwrite a user in the in-memory store."""
    _USERS[username] = bcrypt.hashpw(
        plain_password.encode(), bcrypt.gensalt(rounds=12)
    )


# ── JWT utilities ─────────────────────────────────────────────────────────────

def encode_jwt(payload: dict, expires_in_hours: Optional[int] = None) -> str:
    """
    Encode a JWT token.
    Always adds 'iat' and 'exp' claims.
    """
    hours = expires_in_hours or JWT_EXPIRY_HOURS
    now = datetime.datetime.now(datetime.timezone.utc)
    data = {
        **payload,
        "iat": now,
        "exp": now + datetime.timedelta(hours=hours),
    }
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns the payload dict or None if invalid/expired.
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def create_access_token(username: str) -> str:
    """Create a standard access token for a dashboard user."""
    return encode_jwt({"sub": username, "type": "access"})


def create_client_token(client_id: str) -> str:
    """
    Create a long-lived token for a client node.
    Client tokens expire in 30 days.
    """
    return encode_jwt(
        {"sub": client_id, "type": "client"},
        expires_in_hours=720,  # 30 days
    )


def verify_client_token(token: str) -> Optional[str]:
    """
    Validate a client WebSocket token.
    Returns the client_id (sub) or None.
    """
    payload = decode_jwt(token)
    if not payload:
        return None
    if payload.get("type") != "client":
        return None
    return payload.get("sub")


def verify_access_token(token: str) -> Optional[str]:
    """
    Validate a dashboard user token.
    Returns the username (sub) or None.
    """
    payload = decode_jwt(token)
    if not payload:
        return None
    if payload.get("type") != "access":
        return None
    return payload.get("sub")
