"""Chatbot service (placeholder for future LLM/RAG integration)."""

from sqlalchemy.orm import Session

from app.models.chatbot_log import ChatbotLog
from app.models.user import User
from app.schemas.chatbot import ChatbotRequest, ChatbotResponse


def process_chat(db: Session, user: User, data: ChatbotRequest) -> ChatbotResponse:
    """Process chatbot question and log interaction."""
    answer = (
        "Je suis l'assistant MedSecretariat. "
        "Pour des questions médicales, veuillez contacter votre médecin. "
        "Je peux vous aider avec vos rendez-vous, documents et paiements."
    )

    log = ChatbotLog(
        user_id=user.id,
        question=data.question,
        answer=answer,
        context=data.context,
    )
    db.add(log)
    db.commit()

    return ChatbotResponse(answer=answer)
