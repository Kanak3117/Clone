"""JWT token utilities using PyJWT (HS256)."""

from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

ALGORITHM = "HS256"


def create_access_token(
    user_id: str, expires_minutes: int | None = None
) -> str:
    """Create a JWT access token for the given user_id."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_ws_token(user_id: str) -> str:
    """Create a short-lived (30s) JWT for WebSocket handshake.

    JS can't read httpOnly cookies, so the client calls GET /auth/ws-token
    first, then passes this token as a query parameter to the WS endpoint.
    """
    return create_access_token(user_id, expires_minutes=1)  # 60s for safety margin


def verify_token(token: str) -> str:
    """Decode a JWT and return the user_id (sub claim).

    Raises jwt.PyJWTError on invalid/expired tokens.
    """
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    user_id: str = payload.get("sub", "")
    if not user_id:
        raise jwt.InvalidTokenError("Token missing 'sub' claim")
    return user_id
