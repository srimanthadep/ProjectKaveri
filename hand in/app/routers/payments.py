from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Header, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.domain import Booking, Payment, Room, PaymentMethodEnum
from app.models.auth import Account
from app.schemas.payment import PaymentCreate, Payment as PaymentSchema, PaymentListResponse
from app.dependencies import get_current_user

router = APIRouter(prefix="/bookings", tags=["payments"])

@router.get("/{booking_id}/payments", response_model=PaymentListResponse, summary="Payments recorded against a booking.")
def list_payments(
    booking_id: int = Path(...),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List payments recorded for a booking with total paid and balance."""
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    # Tenant isolation
    if current_user.role.value == "guest" and b.guest_id != current_user.guest_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and b.room.property_id != current_user.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden.")
        
    payments = db.query(Payment).filter(Payment.booking_id == booking_id).order_by(Payment.paid_at.asc()).all()
    
    nights = (b.check_out - b.check_in).days
    total_amount = Decimal(str(b.nightly_rate)) * Decimal(nights)
    total_paid = sum(Decimal(str(p.amount)) for p in payments)
    balance = max(Decimal("0.00"), total_amount - total_paid)
    
    items = [
        PaymentSchema(
            id=p.payment_id,
            booking_id=p.booking_id,
            amount=f"{Decimal(str(p.amount)):.2f}",
            method=p.method.value,
            reference=p.reference,
            paid_at=p.paid_at
        )
        for p in payments
    ]
    
    return PaymentListResponse(
        items=items,
        total_paid=f"{total_paid:.2f}",
        balance=f"{balance:.2f}"
    )

@router.post(
    "/{booking_id}/payments",
    response_model=PaymentSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Record an instalment."
)
def record_payment(
    req: PaymentCreate,
    booking_id: int = Path(...),
    idempotency_key: str = Header(..., alias="Idempotency-Key", description="Client UUID key"),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record payment instalment with strict idempotency (Task 5.6, Rule 8).
    - Same key + same payload: returns 200 and existing payment.
    - Same key + different payload: returns 409 Conflict.
    - Payment exceeding total balance: returns 409 Conflict (Task 5.7).
    """
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    if current_user.role.value == "guest" and b.guest_id != current_user.guest_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and b.room.property_id != current_user.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot record payments for another property.")
        
    payment_amount = Decimal(req.amount)
    if payment_amount <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Payment amount must be positive.")
        
    # Check Idempotency Key
    existing_key_payment = db.query(Payment).filter(Payment.idempotency_key == idempotency_key).first()
    if existing_key_payment:
        # Check if identical payload
        if (
            existing_key_payment.booking_id == booking_id
            and Decimal(str(existing_key_payment.amount)) == payment_amount
            and existing_key_payment.method.value == req.method
        ):
            # Idempotent replay: return 200 OK
            from fastapi.responses import JSONResponse
            from fastapi.encoders import jsonable_encoder
            res_obj = PaymentSchema(
                id=existing_key_payment.payment_id,
                booking_id=existing_key_payment.booking_id,
                amount=f"{Decimal(str(existing_key_payment.amount)):.2f}",
                method=existing_key_payment.method.value,
                reference=existing_key_payment.reference,
                paid_at=existing_key_payment.paid_at
            )
            return JSONResponse(status_code=status.HTTP_200_OK, content=jsonable_encoder(res_obj))
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency key reused with different payment parameters."
            )
            
    # Check Payment Total Cap (Task 5.7)
    nights = (b.check_out - b.check_in).days
    total_amount = Decimal(str(b.nightly_rate)) * Decimal(nights)
    current_paid = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == booking_id).scalar()
    current_paid = Decimal(str(current_paid))
    
    if current_paid + payment_amount > total_amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment amount of {payment_amount:.2f} exceeds outstanding balance of {(total_amount - current_paid):.2f}."
        )
        
    new_payment = Payment(
        booking_id=booking_id,
        amount=payment_amount,
        method=PaymentMethodEnum(req.method),
        reference=req.reference,
        idempotency_key=idempotency_key
    )
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    
    return PaymentSchema(
        id=new_payment.payment_id,
        booking_id=new_payment.booking_id,
        amount=f"{Decimal(str(new_payment.amount)):.2f}",
        method=new_payment.method.value,
        reference=new_payment.reference,
        paid_at=new_payment.paid_at
    )
