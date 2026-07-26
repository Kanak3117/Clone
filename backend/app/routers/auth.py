"""Auth router — register, login, OTP verification, logout, me, ws-token."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_current_user_optional
from app.core.security import create_access_token, create_ws_token
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    OTPRequest,
    RegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

# The fixed OTP for this mock auth system
FIXED_OTP = "123456"


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account. Does not auto-login."""
    # Check duplicate username
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    # Check duplicate phone number (if provided)
    if body.phone_number:
        existing_phone = (
            db.query(User).filter(User.phone_number == body.phone_number).first()
        )
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered",
            )

    user = User(
        username=body.username,
        phone_number=body.phone_number,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/verify-otp", response_model=AuthResponse)
def verify_otp(body: OTPRequest, response: Response, db: Session = Depends(get_db)):
    """Verify OTP and set httpOnly session cookie. Used after registration."""
    if body.otp != FIXED_OTP:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    # Look up user by username or phone
    user = (
        db.query(User)
        .filter(
            (User.username == body.identifier) | (User.phone_number == body.identifier)
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Create JWT and set as httpOnly cookie
    token = create_access_token(user.id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="none",
        secure=True,  # Required for production HTTPS with SameSite=None
        max_age=60 * 60 * 24,  # 24 hours
    )

    # Update online status
    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return AuthResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/login", response_model=AuthResponse)
def login(body: OTPRequest, response: Response, db: Session = Depends(get_db)):
    """Login with username/phone + OTP. User must already exist."""
    if body.otp != FIXED_OTP:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP",
        )

    user = (
        db.query(User)
        .filter(
            (User.username == body.identifier) | (User.phone_number == body.identifier)
        )
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please register first.",
        )

    token = create_access_token(user.id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=60 * 60 * 24,
    )

    user.is_online = True
    user.last_seen = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return AuthResponse(user=UserResponse.model_validate(user), token=token)


@router.post("/logout")
def logout(
    response: Response,
    current_user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Clear the session cookie and set user offline."""
    if current_user:
        current_user.is_online = False
        current_user.last_seen = datetime.now(timezone.utc)
        db.commit()

    response.delete_cookie("session_token")
    return {"detail": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return current_user


@router.get("/ws-token")
def get_ws_token(current_user: User = Depends(get_current_user)):
    """Return a short-lived JWT for WebSocket handshake.

    The frontend calls this before connecting to the WS endpoint,
    since JS cannot read httpOnly cookies.
    """
    token = create_ws_token(current_user.id)
    return {"token": token}
