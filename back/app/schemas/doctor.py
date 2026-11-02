"""Doctor Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    phone: str | None = None
    specialty: str
    address: str | None = None
    city: str | None = None
    license_number: str | None = None


class DoctorUpdate(BaseModel):
    specialty: str | None = None
    address: str | None = None
    city: str | None = None
    license_number: str | None = None


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    specialty: str
    address: str | None
    city: str | None
    license_number: str
    created_at: datetime
    updated_at: datetime


class DoctorWithUserResponse(DoctorResponse):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None

