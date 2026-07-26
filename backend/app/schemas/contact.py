"""Pydantic v2 schemas for contact endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class ContactCreate(BaseModel):
    """POST /contacts request body."""
    contact_user_id: str
    nickname: str | None = Field(None, max_length=100)


class ContactUserInfo(BaseModel):
    """Nested user info within a contact response."""
    id: str
    username: str
    display_name: str
    avatar_url: str | None = None
    is_online: bool = False
    last_seen: datetime | None = None

    model_config = {"from_attributes": True}


class ContactResponse(BaseModel):
    """Contact object returned in API responses."""
    id: str
    owner_id: str
    contact_user_id: str
    nickname: str | None = None
    created_at: datetime
    contact_user: ContactUserInfo | None = None

    model_config = {"from_attributes": True}
