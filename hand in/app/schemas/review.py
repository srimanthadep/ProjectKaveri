from typing import List, Optional
from datetime import datetime
from pydantic import Field
from app.schemas.common import StrictBaseModel, PageMeta

class ReviewCreate(StrictBaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)

class Review(StrictBaseModel):
    id: int
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    guest_name: Optional[str] = None
    created_at: datetime

class ReviewPage(StrictBaseModel):
    items: List[Review]
    meta: PageMeta
