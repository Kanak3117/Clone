"""MessageStatus model — per-recipient delivery/read state for each message."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from app.database import Base


class MessageStatus(Base):
    __tablename__ = "message_status"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    message_id = Column(
        String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status = Column(
        String(10), nullable=False, default="sent"
    )  # "sent", "delivered", "read"
    updated_at = Column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_status"),
    )
