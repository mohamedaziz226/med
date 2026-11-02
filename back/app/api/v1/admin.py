"""Admin API routes."""

from fastapi import APIRouter

from app.api.deps import DbSession, RequireAdmin
from app.models.chatbot_log import ChatbotLog
from app.models.user import User
from app.schemas.chatbot import ChatbotLogResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserResponse])
def list_users(db: DbSession, _: RequireAdmin) -> list[UserResponse]:
    users = db.query(User).order_by(User.id.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.get("/chatbot-logs", response_model=list[ChatbotLogResponse])
def list_chatbot_logs(db: DbSession, _: RequireAdmin) -> list[ChatbotLogResponse]:
    logs = db.query(ChatbotLog).order_by(ChatbotLog.created_at.desc()).limit(100).all()
    return [ChatbotLogResponse.model_validate(log) for log in logs]
