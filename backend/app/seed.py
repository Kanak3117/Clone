"""Seed script — populates the database with demo users, conversations, and messages.

Usage:
    cd signal-clone/backend
    python -m app.seed
"""

import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.database import Base, SessionLocal, engine
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.message_status import MessageStatus
from app.models.participant import ConversationParticipant
from app.models.user import User


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def random_past(max_days: int = 7) -> datetime:
    """Return a random UTC timestamp within the last `max_days` days."""
    delta = timedelta(
        days=random.randint(0, max_days),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
    )
    return utc_now() - delta


# ---------------------------------------------------------------------------
# Demo data
# ---------------------------------------------------------------------------
DEMO_USERS = [
    {
        "id": str(uuid4()),
        "username": "alice",
        "phone_number": "+1234567001",
        "display_name": "Alice Johnson",
        "status_text": "Building Signal Clone",
    },
    {
        "id": str(uuid4()),
        "username": "bob",
        "phone_number": "+1234567002",
        "display_name": "Bob Smith",
        "status_text": "Available",
    },
    {
        "id": str(uuid4()),
        "username": "charlie",
        "phone_number": "+1234567003",
        "display_name": "Charlie Brown",
        "status_text": "At work",
    },
    {
        "id": str(uuid4()),
        "username": "diana",
        "phone_number": "+1234567004",
        "display_name": "Diana Prince",
        "status_text": "Wonder Woman",
    },
    {
        "id": str(uuid4()),
        "username": "eve",
        "phone_number": "+1234567005",
        "display_name": "Eve Williams",
        "status_text": "Encrypted thoughts",
    },
]

# Sample messages for seeding conversations
SAMPLE_MESSAGES = [
    "Hey! How are you?",
    "I'm doing great, thanks for asking!",
    "Did you see the latest update?",
    "Yes, it looks amazing!",
    "We should catch up soon.",
    "Absolutely! How about this weekend?",
    "Sounds like a plan!",
    "Have you tried the new feature?",
    "Not yet, I'll check it out today.",
    "Let me know what you think!",
    "Sure thing!",
    "I just finished the project.",
    "That's awesome! Congrats!",
    "Thanks! It was quite a challenge.",
    "Can you send me the file?",
    "I'll send it right away.",
    "Got it, thanks!",
    "No problem!",
    "Meeting at 3pm today?",
    "Yes, I'll be there.",
    "Don't forget to bring the presentation.",
    "Already prepared!",
    "Perfect, see you then!",
    "Quick question about the API...",
    "Sure, what's up?",
    "How do we handle pagination?",
    "We use cursor-based pagination with message IDs.",
    "That makes sense, thanks!",
    "The dark mode looks really good btw",
    "Signal blue is such a great accent color",
]


def seed():
    """Drop all tables, recreate, and seed with demo data."""
    # Reset database
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ------------------------------------------------------------------
        # 1. Create users
        # ------------------------------------------------------------------
        users: list[User] = []
        for data in DEMO_USERS:
            user = User(
                id=data["id"],
                username=data["username"],
                phone_number=data["phone_number"],
                display_name=data["display_name"],
                status_text=data["status_text"],
                is_online=False,
                last_seen=random_past(max_days=1),
                created_at=random_past(max_days=30),
            )
            db.add(user)
            users.append(user)
        db.flush()

        alice, bob, charlie, diana, eve = users

        # ------------------------------------------------------------------
        # 2. Create contacts (mutual — each pair adds each other)
        # ------------------------------------------------------------------
        contact_pairs = [
            (alice, bob),
            (alice, charlie),
            (alice, diana),
            (alice, eve),
            (bob, charlie),
            (bob, diana),
            (charlie, eve),
        ]
        for user_a, user_b in contact_pairs:
            db.add(Contact(owner_id=user_a.id, contact_user_id=user_b.id))
            db.add(Contact(owner_id=user_b.id, contact_user_id=user_a.id))
        db.flush()

        # ------------------------------------------------------------------
        # 3. Create direct conversations
        # ------------------------------------------------------------------
        direct_pairs = [
            (alice, bob),
            (alice, charlie),
            (bob, diana),
            (charlie, eve),
        ]
        direct_convos: list[Conversation] = []

        for user_a, user_b in direct_pairs:
            ts = random_past(max_days=5)
            convo = Conversation(
                type="direct",
                created_by=user_a.id,
                created_at=ts,
                updated_at=ts,
            )
            db.add(convo)
            db.flush()

            db.add(
                ConversationParticipant(
                    conversation_id=convo.id,
                    user_id=user_a.id,
                    role="member",
                    joined_at=ts,
                )
            )
            db.add(
                ConversationParticipant(
                    conversation_id=convo.id,
                    user_id=user_b.id,
                    role="member",
                    joined_at=ts,
                )
            )
            direct_convos.append(convo)
        db.flush()

        # ------------------------------------------------------------------
        # 4. Create group conversation: "Signal Clone Team"
        # ------------------------------------------------------------------
        group_ts = random_past(max_days=6)
        group_convo = Conversation(
            type="group",
            name="Signal Clone Team",
            created_by=alice.id,
            created_at=group_ts,
            updated_at=group_ts,
        )
        db.add(group_convo)
        db.flush()

        group_members = [alice, bob, charlie, diana]
        for member in group_members:
            db.add(
                ConversationParticipant(
                    conversation_id=group_convo.id,
                    user_id=member.id,
                    role="admin" if member is alice else "member",
                    joined_at=group_ts,
                )
            )
        db.flush()

        # ------------------------------------------------------------------
        # 5. Seed messages into each conversation
        # ------------------------------------------------------------------
        all_convos = direct_convos + [group_convo]

        for convo in all_convos:
            # Get participants for this conversation
            participants = (
                db.query(ConversationParticipant)
                .filter(ConversationParticipant.conversation_id == convo.id)
                .all()
            )
            participant_ids = [p.user_id for p in participants]

            # Generate 8-12 messages per conversation
            num_messages = random.randint(8, 12)
            base_time = convo.created_at
            latest_time = base_time

            for i in range(num_messages):
                sender_id = random.choice(participant_ids)
                msg_time = base_time + timedelta(
                    minutes=random.randint(1, 30) * (i + 1),
                    seconds=random.randint(0, 59),
                )
                latest_time = msg_time

                msg = Message(
                    conversation_id=convo.id,
                    sender_id=sender_id,
                    content=random.choice(SAMPLE_MESSAGES),
                    message_type="text",
                    created_at=msg_time,
                )
                db.add(msg)
                db.flush()

                # Create message_status for each recipient (not the sender)
                for pid in participant_ids:
                    if pid != sender_id:
                        # Vary statuses: older messages more likely to be read
                        if i < num_messages - 2:
                            status = "read"
                        elif i < num_messages - 1:
                            status = "delivered"
                        else:
                            status = "sent"

                        db.add(
                            MessageStatus(
                                message_id=msg.id,
                                user_id=pid,
                                status=status,
                                updated_at=msg_time + timedelta(seconds=random.randint(1, 120)),
                            )
                        )

            # Update conversation.updated_at to the last message time
            convo.updated_at = latest_time

        # ------------------------------------------------------------------
        # 6. Update last_read_message_id for participants
        # ------------------------------------------------------------------
        for convo in all_convos:
            participants = (
                db.query(ConversationParticipant)
                .filter(ConversationParticipant.conversation_id == convo.id)
                .all()
            )
            # Get messages for this conversation, ordered by created_at
            messages = (
                db.query(Message)
                .filter(Message.conversation_id == convo.id)
                .order_by(Message.created_at.asc())
                .all()
            )
            if messages:
                for p in participants:
                    # Set last_read to a message that's not the very latest
                    # (so some conversations show unread counts)
                    read_idx = max(0, len(messages) - random.randint(1, 3))
                    p.last_read_message_id = messages[read_idx].id

        db.commit()

        # ------------------------------------------------------------------
        # Print demo credentials
        # ------------------------------------------------------------------
        print()
        print("=" * 44)
        print("  Signal Clone -- Demo Accounts")
        print("=" * 44)
        for u in users:
            name = f"{u.username:<12}"
            print(f"  {name} | OTP: 123456")
        print("=" * 44)
        print()
        print(f"Database seeded at: {engine.url}")
        print(f"Total users: {len(users)}")
        print(f"Total conversations: {len(all_convos)}")
        total_msgs = db.query(Message).count()
        print(f"Total messages: {total_msgs}")
        print()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
