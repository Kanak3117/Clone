"""Pydantic v2 schemas for authentication endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """POST /auth/register request body."""
    username: str = Field(..., min_length=3, max_length=50)
    phone_number: str | None = Field(None, max_length=20)
    display_name: str = Field(..., min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


class UserUpdate(BaseModel):
    """PATCH /users/me request body."""
    display_name: str | None = Field(None, min_length=1, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)


class OTPRequest(BaseModel):
    """POST /auth/verify-otp and /auth/login request body."""
    identifier: str = Field(..., min_length=1, description="Username or phone number")
    otp: str = Field(..., min_length=6, max_length=6)


class UserResponse(BaseModel):
    """User object returned in API responses."""
    id: str
    username: str
    phone_number: str | None = None
    display_name: str
    avatar_url: str | None = None
    status_text: str | None = None
    is_online: bool = False
    last_seen: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """Response after successful OTP verification."""
    user: UserResponse
    message: str = "Login successful"
