"""Conversation model — represents a direct or group chat."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Index, String

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    type = Column(String(10), nullable=False)  # "direct" or "group"
    name = Column(String(100), nullable=True)  # Group name; null for direct chats
    avatar_url = Column(String(500), nullable=True)
    chat_color = Column(String(50), nullable=True)
    created_by = Column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_conversations_updated_at", "updated_at"),
    )
