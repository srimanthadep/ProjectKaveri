from typing import Optional, Literal
from pydantic import EmailStr, Field
from app.schemas.common import StrictBaseModel

RoleType = Literal["guest", "staff", "manager", "owner"]

class RegisterRequest(StrictBaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=120)
    phone: Optional[str] = None

class LoginRequest(StrictBaseModel):
    email: EmailStr
    password: str

class RefreshRequest(StrictBaseModel):
    refresh_token: str

class TokenPair(StrictBaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int

class Me(StrictBaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleType
    property_id: Optional[int] = None
