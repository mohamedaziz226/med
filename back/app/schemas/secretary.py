"""Secretary Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SecretaryCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    phone: str | None = None
    doctor_id: int


class SecretaryUpdate(BaseModel):
    doctor_id: int | None = None


class SecretaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    doctor_id: int
    created_at: datetime
    updated_at: datetime


class SecretaryWithUserResponse(SecretaryResponse):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None

