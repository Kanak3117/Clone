"""Contacts router — list and add contacts."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactResponse, ContactUserInfo

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    search: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's contacts, with optional name search."""
    query = db.query(Contact).filter(Contact.owner_id == current_user.id)

    contacts = query.all()

    # Build response with contact user info
    result = []
    for contact in contacts:
        contact_user = db.query(User).filter(User.id == contact.contact_user_id).first()
        if not contact_user:
            continue

        # Apply search filter on contact user's name or username
        if search:
            search_lower = search.lower()
            if (
                search_lower not in contact_user.display_name.lower()
                and search_lower not in contact_user.username.lower()
                and (
                    not contact.nickname
                    or search_lower not in contact.nickname.lower()
                )
            ):
                continue

        result.append(
            ContactResponse(
                id=contact.id,
                owner_id=contact.owner_id,
                contact_user_id=contact.contact_user_id,
                nickname=contact.nickname,
                created_at=contact.created_at,
                contact_user=ContactUserInfo.model_validate(contact_user),
            )
        )

    return result


@router.post("", response_model=ContactResponse, status_code=201)
def add_contact(
    body: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a user as a contact. Returns 409 if already exists."""
    # Can't add yourself
    if body.contact_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add yourself as a contact",
        )

    # Check target user exists
    target_user = db.query(User).filter(User.id == body.contact_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check duplicate
    existing = (
        db.query(Contact)
        .filter(
            Contact.owner_id == current_user.id,
            Contact.contact_user_id == body.contact_user_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already in your contacts",
        )

    contact = Contact(
        owner_id=current_user.id,
        contact_user_id=body.contact_user_id,
        nickname=body.nickname,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    return ContactResponse(
        id=contact.id,
        owner_id=contact.owner_id,
        contact_user_id=contact.contact_user_id,
        nickname=contact.nickname,
        created_at=contact.created_at,
        contact_user=ContactUserInfo.model_validate(target_user),
    )
