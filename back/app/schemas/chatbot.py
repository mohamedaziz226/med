"""Chatbot Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatbotRequest(BaseModel):
    question: str
    context: str | None = None


class ChatbotResponse(BaseModel):
    answer: str


class ChatbotLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    question: str
    answer: str
    context: str | None
    created_at: datetime
    updated_at: datetime
