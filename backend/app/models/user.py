"""User model — stores account info, profile, and presence state."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String, Text

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    username = Column(String(50), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), unique=True, nullable=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    status_text = Column(Text, nullable=True, default="Hey there! I am using Signal Clone.")
    is_online = Column(Boolean, default=False, nullable=False)
    last_seen = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
