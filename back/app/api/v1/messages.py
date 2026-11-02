"""Messaging API routes."""

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.message import MessageCreate, MessageResponse
from app.services import message_service

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageResponse, status_code=201)
def send_message(data: MessageCreate, db: DbSession, current_user: CurrentUser) -> MessageResponse:
    message = message_service.send_message(db, current_user, data)
    return MessageResponse.model_validate(message)


@router.get("/conversation/{other_user_id}", response_model=list[MessageResponse])
def get_conversation(
    other_user_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> list[MessageResponse]:
    messages = message_service.get_conversation(db, current_user.id, other_user_id)
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/{message_id}/read", response_model=MessageResponse)
def mark_read(message_id: int, db: DbSession, current_user: CurrentUser) -> MessageResponse:
    message = message_service.mark_as_read(db, message_id, current_user)
    return MessageResponse.model_validate(message)


@router.get("/unread/count")
def unread_count(db: DbSession, current_user: CurrentUser) -> dict[str, int]:
    count = message_service.get_unread_count(db, current_user.id)
    return {"count": count}
