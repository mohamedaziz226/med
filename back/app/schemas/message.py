"""Message Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    receiver_id: int
    content: str


class MessageUpdate(BaseModel):
    is_read: bool | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime
    updated_at: datetime
