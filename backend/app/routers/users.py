"""Users router — search users (for adding contacts)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def search_users(
    search: str = Query("", min_length=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users by username or display name. Excludes the current user."""
    if not search:
        # Return all users except current (for small scale this is fine)
        users = db.query(User).filter(User.id != current_user.id).limit(50).all()
    else:
        search_pattern = f"%{search}%"
        users = (
            db.query(User)
            .filter(
                User.id != current_user.id,
                (User.username.ilike(search_pattern))
                | (User.display_name.ilike(search_pattern)),
            )
            .limit(50)
            .all()
        )

    return users


@router.patch("/me", response_model=UserResponse)
def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user's profile."""
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
        
    db.commit()
    db.refresh(current_user)
    
    return current_user
