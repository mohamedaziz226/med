"""Schemas Pydantic pour les utilisateurs."""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional

from app.core.constants import UserRole


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    role: UserRole


class UserLogin(BaseModel):
    """Schema pour le login (alias: LoginRequest)."""
    email: EmailStr
    password: str


LoginRequest = UserLogin


class RefreshRequest(BaseModel):
    refresh_token: str


class Verify2FARequest(BaseModel):
    pre_auth_token: str
    otp_code: str = Field(..., min_length=4, max_length=8)


class Resend2FARequest(BaseModel):
    pre_auth_token: str


class Enable2FARequest(BaseModel):
    password: str


class Disable2FARequest(BaseModel):
    password: str
    otp_code: str = Field(..., min_length=4, max_length=8)


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    is_2fa_enabled: bool = False
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False
    pre_auth_token: Optional[str] = None
    message: Optional[str] = None
    user: Optional[UserResponse] = None


class TwoFAStatusResponse(BaseModel):
    is_2fa_enabled: bool
    message: str
