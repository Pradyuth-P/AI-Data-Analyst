from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "user"
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDBBase(UserBase):
    id: UUID4
    created_at: datetime

    class Config:
        from_attributes = True

class UserResponse(UserInDBBase):
    pass

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class PasswordReset(BaseModel):
    email: EmailStr
