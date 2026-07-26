"""Pydantic v2 schemas for message endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    """POST /conversations/{id}/messages request body."""
    content: str = Field(..., min_length=1, max_length=5000)


class SenderInfo(BaseModel):
    """Nested sender info within a message response."""
    id: str
    display_name: str
    avatar_url: str | None = None
    username: str

    model_config = {"from_attributes": True}


class MessageStatusInfo(BaseModel):
    """Per-recipient message status."""
    user_id: str
    status: str  # sent | delivered | read
    updated_at: datetime


class MessageResponse(BaseModel):
    """Message object returned in API responses."""
    id: str
    conversation_id: str
    sender_id: str | None = None
    sender: SenderInfo | None = None
    content: str
    message_type: str
    created_at: datetime
    statuses: list[MessageStatusInfo] = []


class PaginatedMessages(BaseModel):
    """Cursor-paginated message response."""
    messages: list[MessageResponse]
    has_more: bool
