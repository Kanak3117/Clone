"""Pydantic v2 schemas for conversation endpoints."""

from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    """POST /conversations request body."""
    type: str = Field(..., pattern="^(direct|group)$")
    participant_ids: list[str] = Field(..., min_length=1)
    name: str | None = Field(None, max_length=100)


class ConversationUpdate(BaseModel):
    """PATCH /conversations/{id} request body."""
    name: str | None = Field(None, max_length=100)
    avatar_url: str | None = None
    chat_color: str | None = None


class ConversationColorUpdate(BaseModel):
    """PATCH /conversations/{id}/color request body."""
    color: str | None = None


class MemberAdd(BaseModel):
    """POST /conversations/{id}/members request body."""
    user_id: str


class ParticipantInfo(BaseModel):
    """Participant info with user details."""
    id: str
    user_id: str
    role: str
    joined_at: datetime
    display_name: str
    username: str
    avatar_url: str | None = None
    is_online: bool = False


class LastMessageInfo(BaseModel):
    """Truncated last message for conversation list items."""
    id: str
    content: str
    sender_id: str
    sender_name: str
    message_type: str
    created_at: datetime


class ConversationListItem(BaseModel):
    """Conversation summary for the sidebar list."""
    id: str
    type: str
    name: str | None = None
    avatar_url: str | None = None
    chat_color: str | None = None
    created_by: str | None = None
    updated_at: datetime
    last_message: LastMessageInfo | None = None
    unread_count: int = 0
    participants: list[ParticipantInfo] = []


class ConversationDetail(BaseModel):
    """Full conversation details including participants."""
    id: str
    type: str
    name: str | None = None
    avatar_url: str | None = None
    chat_color: str | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime
    participants: list[ParticipantInfo] = []
