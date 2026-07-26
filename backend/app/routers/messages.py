"""Messages router — send, list (paginated), and mark as read."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.user import User
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageStatusInfo,
    PaginatedMessages,
    SenderInfo,
)

router = APIRouter(prefix="/conversations", tags=["messages"])


def _build_message_response(db: Session, msg: Message) -> MessageResponse:
    """Build a full message response with sender info and statuses."""
    sender = db.query(User).filter(User.id == msg.sender_id).first()
    sender_info = None
    if sender:
        sender_info = SenderInfo(
            id=sender.id,
            display_name=sender.display_name,
            avatar_url=sender.avatar_url,
            username=sender.username,
        )

    statuses = (
        db.query(MessageStatus)
        .filter(MessageStatus.message_id == msg.id)
        .all()
    )
    status_list = [
        MessageStatusInfo(
            user_id=s.user_id,
            status=s.status,
            updated_at=s.updated_at,
        )
        for s in statuses
    ]

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=sender_info,
        content=msg.content,
        message_type=msg.message_type,
        created_at=msg.created_at,
        statuses=status_list,
    )


@router.get("/{conversation_id}/messages", response_model=PaginatedMessages)
def list_messages(
    conversation_id: str,
    before: str | None = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List messages in a conversation with cursor-based pagination.

    - `before`: message ID — returns messages older than this one
    - `limit`: max messages to return (default 20)
    """
    # Verify user is a participant
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query = db.query(Message).filter(Message.conversation_id == conversation_id)

    if before:
        cursor_msg = db.query(Message).filter(Message.id == before).first()
        if cursor_msg:
            query = query.filter(Message.created_at < cursor_msg.created_at)

    # Fetch limit + 1 to check if there are more
    messages = (
        query.order_by(Message.created_at.desc())
        .limit(limit + 1)
        .all()
    )

    has_more = len(messages) > limit
    messages = messages[:limit]

    return PaginatedMessages(
        messages=[_build_message_response(db, m) for m in messages],
        has_more=has_more,
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=201,
)
def send_message(
    conversation_id: str,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to a conversation."""
    # Verify user is a participant
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc)

    # Create the message
    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=body.content,
        message_type="text",
        created_at=now,
    )
    db.add(message)
    db.flush()

    # Create message_status for every other participant
    other_participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id != current_user.id,
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

    # Bump conversation.updated_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.updated_at = now

    db.commit()
    db.refresh(message)

    return _build_message_response(db, message)


@router.post("/{conversation_id}/read")
def mark_as_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all messages in a conversation as read for the current user."""
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Conversation not found")

    now = datetime.now(timezone.utc)

    # Update all message statuses for this user in this conversation
    message_ids = (
        db.query(Message.id)
        .filter(Message.conversation_id == conversation_id)
    )
    db.query(MessageStatus).filter(
        MessageStatus.message_id.in_(message_ids),
        MessageStatus.user_id == current_user.id,
        MessageStatus.status != "read",
    ).update({"status": "read", "updated_at": now}, synchronize_session="fetch")

    # Update last_read_message_id to the latest message
    latest_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .first()
    )
    if latest_msg:
        participant.last_read_message_id = latest_msg.id

    db.commit()

    return {"detail": "Messages marked as read"}
