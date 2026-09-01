from typing import List, Optional
from pydantic import EmailStr
from app.schemas.common import StrictBaseModel, PageMeta

class Guest(StrictBaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    stay_count: Optional[int] = 0

class GuestPage(StrictBaseModel):
    items: List[Guest]
    meta: PageMeta
