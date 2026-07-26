"""WebSocket connection manager for real-time signaling."""

import logging
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.participant import ConversationParticipant
from app.models.user import User

logger = logging.getLogger("signal-clone.ws")


class ConnectionManager:
    def __init__(self):
        # Maps user_id -> list of active WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected via WebSocket.")

        # Update presence and broadcast
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user and not user.is_online:
                user.is_online = True
                user.last_seen = datetime.now(timezone.utc)
                db.commit()
                # Broadcast presence update
                await self.broadcast_presence(user_id, True, user.last_seen)
        finally:
            db.close()

    async def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"User {user_id} disconnected completely.")

                # Update presence and broadcast
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        user.is_online = False
                        user.last_seen = datetime.now(timezone.utc)
                        db.commit()
                        # Broadcast presence update
                        await self.broadcast_presence(user_id, False, user.last_seen)
                finally:
                    db.close()

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")

    async def broadcast_to_conversation(
        self, conversation_id: str, data: dict, exclude_user_id: str | None = None
    ):
        """Broadcast a message to all participants in a conversation."""
        db = SessionLocal()
        try:
            participants = (
                db.query(ConversationParticipant)
                .filter(ConversationParticipant.conversation_id == conversation_id)
                .all()
            )
            for p in participants:
                if p.user_id != exclude_user_id:
                    await self.send_to_user(p.user_id, data)
        finally:
            db.close()

    async def broadcast_presence(self, user_id: str, is_online: bool, last_seen: datetime):
        """Broadcast presence update to all users (simplification: we send to everyone currently online)."""
        data = {
            "type": "presence:update",
            "user_id": user_id,
            "is_online": is_online,
            "last_seen": last_seen.isoformat() if last_seen else None,
        }
        for uid in list(self.active_connections.keys()):
            if uid != user_id:
                await self.send_to_user(uid, data)


manager = ConnectionManager()
