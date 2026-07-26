"""Conversations router — CRUD, member management, with DM dedup."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetail,
    ConversationListItem,
    ConversationUpdate,
    LastMessageInfo,
    MemberAdd,
    ParticipantInfo,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _get_participant_info(db: Session, conversation_id: str) -> list[ParticipantInfo]:
    """Build participant info list for a conversation."""
    participants = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.conversation_id == conversation_id)
        .all()
    )
    result = []
    for p in participants:
        user = db.query(User).filter(User.id == p.user_id).first()
        if user:
            result.append(
                ParticipantInfo(
                    id=p.id,
                    user_id=p.user_id,
                    role=p.role,
                    joined_at=p.joined_at,
                    display_name=user.display_name,
                    username=user.username,
                    avatar_url=user.avatar_url,
                    is_online=user.is_online,
                )
            )
    return result


def _get_last_message(db: Session, conversation_id: str) -> LastMessageInfo | None:
    """Get the most recent message in a conversation."""
    msg = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .first()
    )
    if not msg:
        return None

    sender = db.query(User).filter(User.id == msg.sender_id).first()
    return LastMessageInfo(
        id=msg.id,
        content=msg.content[:100],  # Truncate for preview
        sender_id=msg.sender_id or "",
        sender_name=sender.display_name if sender else "Unknown",
        message_type=msg.message_type,
        created_at=msg.created_at,
    )


def _get_unread_count(db: Session, conversation_id: str, user_id: str) -> int:
    """Count unread messages in a conversation for a specific user.

    A message is unread if:
    - It was sent by someone else
    - It was created after the user's last_read_message (by created_at)
    """
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not participant:
        return 0

    query = db.query(func.count(Message.id)).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
        Message.message_type == "text",  # Don't count system messages
    )

    if participant.last_read_message_id:
        last_read_msg = (
            db.query(Message)
            .filter(Message.id == participant.last_read_message_id)
            .first()
        )
        if last_read_msg:
            query = query.filter(Message.created_at > last_read_msg.created_at)

    return query.scalar() or 0


@router.get("", response_model=list[ConversationListItem])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the current user, sorted by updated_at desc."""
    # Get conversation IDs the user participates in
    participant_records = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.user_id == current_user.id)
        .all()
    )
    conv_ids = [p.conversation_id for p in participant_records]

    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(conv_ids))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    result = []
    for conv in conversations:
        participants = _get_participant_info(db, conv.id)

        # For direct chats, derive the display name from the other participant
        display_name = conv.name
        if conv.type == "direct":
            other = [p for p in participants if p.user_id != current_user.id]
            if other:
                display_name = other[0].display_name

        result.append(
            ConversationListItem(
                id=conv.id,
                type=conv.type,
                name=display_name,
                avatar_url=conv.avatar_url,
                created_by=conv.created_by,
                updated_at=conv.updated_at,
                last_message=_get_last_message(db, conv.id),
                unread_count=_get_unread_count(db, conv.id, current_user.id),
                participants=participants,
            )
        )

    return result


@router.post("", response_model=ConversationDetail, status_code=201)
def create_conversation(
    body: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation.

    For type=direct: checks if a DM between the same 2 users already exists
    and returns it instead of creating a duplicate.
    """
    # Ensure current user is included in participants
    all_participant_ids = list(set(body.participant_ids + [current_user.id]))

    # Validate all participants exist
    for uid in all_participant_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {uid} not found",
            )

    if body.type == "direct":
        if len(all_participant_ids) != 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Direct conversations must have exactly 2 participants",
            )

        # DM dedup: check if a direct conversation between these exact 2 users exists
        user_a, user_b = all_participant_ids
        existing_convos = (
            db.query(Conversation)
            .filter(Conversation.type == "direct")
            .join(
                ConversationParticipant,
                ConversationParticipant.conversation_id == Conversation.id,
            )
            .filter(ConversationParticipant.user_id.in_([user_a, user_b]))
            .all()
        )

        for conv in existing_convos:
            participants = (
                db.query(ConversationParticipant)
                .filter(ConversationParticipant.conversation_id == conv.id)
                .all()
            )
            participant_user_ids = set(p.user_id for p in participants)
            if participant_user_ids == {user_a, user_b}:
                # Existing DM found — return it
                return ConversationDetail(
                    id=conv.id,
                    type=conv.type,
                    name=conv.name,
                    avatar_url=conv.avatar_url,
                    created_by=conv.created_by,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    participants=_get_participant_info(db, conv.id),
                )

    # Create the conversation
    now = datetime.now(timezone.utc)
    conversation = Conversation(
        type=body.type,
        name=body.name,
        created_by=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(conversation)
    db.flush()

    # Add participants
    for uid in all_participant_ids:
        role = "admin" if (body.type == "group" and uid == current_user.id) else "member"
        db.add(
            ConversationParticipant(
                conversation_id=conversation.id,
                user_id=uid,
                role=role,
                joined_at=now,
            )
        )

    db.commit()
    db.refresh(conversation)

    return ConversationDetail(
        id=conversation.id,
        type=conversation.type,
        name=conversation.name,
        avatar_url=conversation.avatar_url,
        created_by=conversation.created_by,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=_get_participant_info(db, conversation.id),
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full details of a conversation."""
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return ConversationDetail(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        avatar_url=conv.avatar_url,
        created_by=conv.created_by,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        participants=_get_participant_info(db, conv.id),
    )


@router.patch("/{conversation_id}", response_model=ConversationDetail)
def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update conversation name/avatar. Admin-only for groups."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

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

    # Admin check for groups
    if conv.type == "group" and participant.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update group info")

    if body.name is not None:
        conv.name = body.name
    if body.avatar_url is not None:
        conv.avatar_url = body.avatar_url

    conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conv)

    return ConversationDetail(
        id=conv.id,
        type=conv.type,
        name=conv.name,
        avatar_url=conv.avatar_url,
        created_by=conv.created_by,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        participants=_get_participant_info(db, conv.id),
    )


@router.post("/{conversation_id}/members", status_code=201)
def add_member(
    conversation_id: str,
    body: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a member to a group conversation. Admin-only."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Can only add members to groups")

    # Check admin
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not participant or participant.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add members")

    # Check target user exists
    target_user = db.query(User).filter(User.id == body.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already a member
    existing = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == body.user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member")

    now = datetime.now(timezone.utc)

    # Add participant
    db.add(
        ConversationParticipant(
            conversation_id=conversation_id,
            user_id=body.user_id,
            role="member",
            joined_at=now,
        )
    )

    # Create system message
    system_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} added {target_user.display_name}",
        message_type="system",
        created_at=now,
    )
    db.add(system_msg)

    conv.updated_at = now
    db.commit()

    return {"detail": f"{target_user.display_name} added to the group"}


@router.delete("/{conversation_id}/members/{user_id}")
def remove_member(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a group conversation. Admin-only."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.type != "group":
        raise HTTPException(status_code=400, detail="Can only remove members from groups")

    # Check admin
    requester = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not requester or requester.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    # Find target participant
    target_participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not target_participant:
        raise HTTPException(status_code=404, detail="User is not a member")

    target_user = db.query(User).filter(User.id == user_id).first()
    target_name = target_user.display_name if target_user else "Unknown"

    now = datetime.now(timezone.utc)

    # Remove participant
    db.delete(target_participant)

    # Create system message
    system_msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=f"{current_user.display_name} removed {target_name}",
        message_type="system",
        created_at=now,
    )
    db.add(system_msg)

    conv.updated_at = now
    db.commit()

    return {"detail": f"{target_name} removed from the group"}
