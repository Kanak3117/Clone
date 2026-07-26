"""FastAPI dependencies for auth and database access."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import jwt

from app.core.security import verify_token
from app.database import get_db
from app.models.user import User


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    """Extract and validate the session token from the httpOnly cookie.

    Returns the authenticated User or raises 401.
    """
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        user_id = verify_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user

def get_current_user_optional(
    request: Request, db: Session = Depends(get_db)
) -> User | None:
    """Extract and validate the session token. Returns None if invalid."""
    token = request.cookies.get("session_token")
    if not token:
        return None

    try:
        user_id = verify_token(token)
    except jwt.PyJWTError:
        return None

    return db.query(User).filter(User.id == user_id).first()
