from typing import List, Literal, Optional
from datetime import datetime
from app.schemas.common import StrictBaseModel

PaymentMethod = Literal["card", "upi", "bank_transfer", "cash"]

class PaymentCreate(StrictBaseModel):
    amount: str
    method: PaymentMethod
    reference: Optional[str] = None
    idempotency_key: Optional[str] = None

class Payment(StrictBaseModel):
    id: int
    booking_id: int
    amount: str
    method: PaymentMethod
    reference: Optional[str] = None
    paid_at: datetime

class PaymentListResponse(StrictBaseModel):
    items: List[Payment]
    total_paid: str
    balance: str
