"""Messaging service."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.message import Message
from app.models.user import User
from app.schemas.message import MessageCreate


def send_message(db: Session, sender: User, data: MessageCreate) -> Message:
    """Send a message from current user to receiver."""
    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise NotFoundException("Receiver not found")
    if not receiver.is_active:
        raise ForbiddenException("Cannot message inactive user")

    message = Message(
        sender_id=sender.id,
        receiver_id=data.receiver_id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_conversation(db: Session, user_id: int, other_user_id: int) -> list[Message]:
    """Get messages between two users."""
    return (
        db.query(Message)
        .filter(
            ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id))
            | ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
        )
        .order_by(Message.created_at.asc())
        .all()
    )


def mark_as_read(db: Session, message_id: int, user: User) -> Message:
    """Mark message as read by receiver."""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise NotFoundException("Message not found")
    if message.receiver_id != user.id:
        raise ForbiddenException()

    message.is_read = True
    message.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(message)
    return message


def get_unread_count(db: Session, user_id: int) -> int:
    """Count unread messages for user."""
    return db.query(Message).filter(Message.receiver_id == user_id, Message.is_read.is_(False)).count()
