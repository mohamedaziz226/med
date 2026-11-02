"""Patient Pydantic schemas."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PatientCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: str
    phone: str | None = None
    doctor_id: int
    date_of_birth: date | None = None
    blood_type: str | None = None
    allergies: str | None = None
    medical_history: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    social_security_number: str | None = None


class PatientUpdate(BaseModel):
    date_of_birth: date | None = None
    blood_type: str | None = None
    allergies: str | None = None
    medical_history: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    social_security_number: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    doctor_id: int
    date_of_birth: date | None
    blood_type: str | None
    allergies: str | None
    medical_history: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    social_security_number: str | None
    created_at: datetime
    updated_at: datetime


class PatientWithUserResponse(PatientResponse):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
