from typing import List, Literal, Optional
from datetime import date, datetime
from pydantic import Field, field_validator
from app.schemas.common import StrictBaseModel, PageMeta
from app.schemas.payment import PaymentCreate

BookingStatus = Literal["confirmed", "checked_in", "checked_out", "cancelled", "no_show"]

class BookingCreate(StrictBaseModel):
    room_id: int
    check_in: date
    check_out: date
    guests: int = Field(ge=1)
    guest_id: Optional[int] = None
    deposit: Optional[PaymentCreate] = None
    
    @field_validator("check_out")
    @classmethod
    def validate_dates(cls, v: date, info) -> date:
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("check_out date must be strictly after check_in date.")
        return v

class Booking(StrictBaseModel):
    id: int
    property_id: int
    room_id: int
    room_number: str
    guest_id: int
    guest_name: str
    check_in: date
    check_out: date
    nights: int
    guests: int
    status: BookingStatus
    total_amount: str
    total_paid: str
    balance: str
    created_at: datetime

class BookingPage(StrictBaseModel):
    items: List[Booking]
    meta: PageMeta
