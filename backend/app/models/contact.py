"""Contact model — tracks which users a person has added to their contacts."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint

from app.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    contact_user_id = Column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    nickname = Column(String(100), nullable=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id", name="uq_owner_contact"),
    )
