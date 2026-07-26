"""WebSocket router for real-time messaging events."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

import jwt

from app.core.security import verify_token
from app.database import get_db, SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.user import User
from app.ws.manager import manager

logger = logging.getLogger("signal-clone.ws")

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """WebSocket endpoint for real-time signaling.

    Requires a short-lived WS token passed in the query string.
    """
    try:
        user_id = verify_token(token)
    except jwt.PyJWTError:
        logger.warning("WebSocket connection rejected: Invalid token")
        await websocket.close(code=1008)
        return

    # Verify user exists
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"WebSocket connection rejected: User {user_id} not found")
            await websocket.close(code=1008)
            return
        user_display_name = user.display_name
        user_avatar_url = user.avatar_url
        username = user.username
    finally:
        db.close()

    await manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if not event_type:
                continue

            if event_type == "message:send":
                await handle_message_send(user_id, data, user_display_name, user_avatar_url, username)
            elif event_type == "typing:start":
                await handle_typing(user_id, data, True)
            elif event_type == "typing:stop":
                await handle_typing(user_id, data, False)
            elif event_type == "message:read":
                await handle_message_read(user_id, data)

    except WebSocketDisconnect:
        await manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.exception(f"WebSocket error for user {user_id}: {e}")
        await manager.disconnect(user_id, websocket)


async def handle_message_send(user_id: str, data: dict, display_name: str, avatar_url: str | None, username: str):
    """Handle incoming message:send event."""
    conversation_id = data.get("conversation_id")
    content = data.get("content")
    temp_id = data.get("temp_id")

    if not conversation_id or not content:
        return

    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        # Verify user is a participant
        participant = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if not participant:
            return

        # Create message
        message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            message_type="text",
            created_at=now,
        )
        db.add(message)
        db.flush()

        # Create statuses
        other_participants = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id != user_id,
            )
            .all()
        )
        for p in other_participants:
            db.add(
                MessageStatus(
                    message_id=message.id,
                    user_id=p.user_id,
                    status="sent",
                    updated_at=now,
                )
            )

        # Bump updated_at
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conv:
            conv.updated_at = now

        db.commit()

        msg_id = message.id
        msg_created_at = message.created_at.isoformat()
    finally:
        db.close()

    # Broadcast new message
    payload = {
        "type": "message:new",
        "temp_id": temp_id,
        "message": {
            "id": msg_id,
            "conversation_id": conversation_id,
            "sender_id": user_id,
            "sender": {
                "id": user_id,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "username": username,
            },
            "content": content,
            "message_type": "text",
            "created_at": msg_created_at,
        },
    }
    await manager.broadcast_to_conversation(conversation_id, payload)


async def handle_typing(user_id: str, data: dict, is_typing: bool):
    """Handle typing:start and typing:stop events."""
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return

    payload = {
        "type": "typing:update",
        "conversation_id": conversation_id,
        "user_id": user_id,
        "is_typing": is_typing,
    }
    await manager.broadcast_to_conversation(conversation_id, payload, exclude_user_id=user_id)


async def handle_message_read(user_id: str, data: dict):
    """Handle message:read event."""
    conversation_id = data.get("conversation_id")
    message_id = data.get("message_id")

    if not conversation_id or not message_id:
        return

    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        # Verify user is a participant
        participant = (
            db.query(ConversationParticipant)
            .filter(
                ConversationParticipant.conversation_id == conversation_id,
                ConversationParticipant.user_id == user_id,
            )
            .first()
        )
        if not participant:
            return

        # Update status
        status_record = (
            db.query(MessageStatus)
            .filter(
                MessageStatus.message_id == message_id,
                MessageStatus.user_id == user_id,
                MessageStatus.status != "read",
            )
            .first()
        )
        if status_record:
            status_record.status = "read"
            status_record.updated_at = now

            # Update last_read_message_id if newer
            msg = db.query(Message).filter(Message.id == message_id).first()
            if msg:
                if not participant.last_read_message_id:
                    participant.last_read_message_id = message_id
                else:
                    last_read = db.query(Message).filter(Message.id == participant.last_read_message_id).first()
                    if last_read and msg.created_at > last_read.created_at:
                        participant.last_read_message_id = message_id

            db.commit()

            # Broadcast read status to the sender
            msg_owner_id = msg.sender_id
            if msg_owner_id:
                payload = {
                    "type": "message:status",
                    "message_id": message_id,
                    "user_id": user_id,
                    "status": "read",
                    "conversation_id": conversation_id,
                }
                await manager.send_to_user(msg_owner_id, payload)
    finally:
        db.close()
