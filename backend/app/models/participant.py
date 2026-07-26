"""ConversationParticipant model — junction table linking users to conversations."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from app.database import Base


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    conversation_id = Column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(String(10), nullable=False, default="member")  # "admin" or "member"
    joined_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    last_read_message_id = Column(String(36), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "conversation_id", "user_id", name="uq_conversation_user"
        ),
    )
