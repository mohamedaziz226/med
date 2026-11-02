"""Chatbot API routes."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.chatbot import ChatbotRequest, ChatbotResponse
from app.services import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/chat", response_model=ChatbotResponse)
def chat(data: ChatbotRequest, db: DbSession, current_user: CurrentUser) -> ChatbotResponse:
    return chatbot_service.process_chat(db, current_user, data)
