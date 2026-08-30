from datetime import date, timedelta
from typing import Optional, List, Literal
from decimal import Decimal
import threading
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.db import get_db
from app.models.domain import Booking, Room, RoomType, Property, Guest, RatePlan, Payment, BookingStatusEnum, PaymentMethodEnum
from app.models.auth import Account
from app.schemas.booking import (
    BookingCreate, Booking as BookingSchema, BookingPage, BookingStatus
)
from app.schemas.common import PageMeta
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/bookings", tags=["bookings"])
booking_lock = threading.Lock()

def format_booking_response(b: Booking, total_paid: Decimal) -> BookingSchema:
    nights = (b.check_out - b.check_in).days
    total_amount = Decimal(str(b.nightly_rate)) * Decimal(nights)
    balance = total_amount - total_paid
    if balance < Decimal("0.00"):
        balance = Decimal("0.00")
        
    return BookingSchema(
        id=b.booking_id,
        property_id=b.room.property_id,
        room_id=b.room_id,
        room_number=b.room.room_number,
        guest_id=b.guest_id,
        guest_name=b.guest.full_name,
        check_in=b.check_in,
        check_out=b.check_out,
        nights=nights,
        guests=b.guests_count,
        status=b.status.value,
        total_amount=f"{total_amount:.2f}",
        total_paid=f"{total_paid:.2f}",
        balance=f"{balance:.2f}",
        created_at=b.created_at
    )

@router.get("", response_model=BookingPage, summary="Bookings visible to the caller.")
def list_bookings(
    property_id: Optional[int] = Query(None),
    status_filter: Optional[BookingStatus] = Query(None, alias="status"),
    guest_id: Optional[int] = Query(None, description="Ignored for callers with guest role."),
    from_: Optional[date] = Query(None, alias="from"),
    to: Optional[date] = Query(None, alias="to"),
    sort: Literal["check_in", "-check_in", "created_at", "-created_at", "total_amount", "-total_amount"] = Query("-check_in"),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Booking).join(Room, Booking.room_id == Room.room_id).join(Guest, Booking.guest_id == Guest.guest_id)
    
    if current_user.role.value == "guest":
        query = query.filter(Booking.guest_id == current_user.guest_id)
    elif current_user.role.value in ("staff", "manager"):
        query = query.filter(Room.property_id == current_user.property_id)
        if guest_id is not None:
            query = query.filter(Booking.guest_id == guest_id)
    elif current_user.role.value == "owner":
        if property_id is not None:
            query = query.filter(Room.property_id == property_id)
        if guest_id is not None:
            query = query.filter(Booking.guest_id == guest_id)
            
    if status_filter:
        query = query.filter(Booking.status == BookingStatusEnum(status_filter))
    if from_:
        query = query.filter(Booking.check_in >= from_)
    if to:
        query = query.filter(Booking.check_out <= to)
        
    total = query.count()
    
    if sort == "check_in":
        query = query.order_by(Booking.check_in.asc(), Booking.booking_id.asc())
    elif sort == "-check_in":
        query = query.order_by(Booking.check_in.desc(), Booking.booking_id.desc())
    elif sort == "created_at":
        query = query.order_by(Booking.created_at.asc(), Booking.booking_id.asc())
    elif sort == "-created_at":
        query = query.order_by(Booking.created_at.desc(), Booking.booking_id.desc())
    elif sort == "total_amount":
        query = query.order_by(Booking.nightly_rate.asc())
    elif sort == "-total_amount":
        query = query.order_by(Booking.nightly_rate.desc())
        
    bookings = query.offset(offset).limit(limit).all()
    
    # Single aggregate query for all payment totals on this page, instead of
    # one SUM(...) round trip per booking (N+1). Falls back to 0 for bookings
    # with no payments, since the dict lookup below defaults missing keys.
    booking_ids = [b.booking_id for b in bookings]
    paid_totals: dict[int, Decimal] = {}
    if booking_ids:
        rows = (
            db.query(Payment.booking_id, func.coalesce(func.sum(Payment.amount), 0))
            .filter(Payment.booking_id.in_(booking_ids))
            .group_by(Payment.booking_id)
            .all()
        )
        paid_totals = {booking_id: Decimal(str(total)) for booking_id, total in rows}
    
    items = [
        format_booking_response(b, paid_totals.get(b.booking_id, Decimal("0.00")))
        for b in bookings
    ]
        
    return BookingPage(
        items=items,
        meta=PageMeta(limit=limit, offset=offset, total=total)
    )

@router.post("", response_model=BookingSchema, status_code=status.HTTP_201_CREATED, summary="Take a booking.")
def create_booking(
    req: BookingCreate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    with booking_lock:
        room = db.query(Room).join(RoomType).filter(Room.room_id == req.room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
            
        if current_user.role.value in ("staff", "manager") and current_user.property_id != room.property_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot book rooms at another property.")
            
        if req.guests > room.room_type.max_occupancy:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Guest count of {req.guests} exceeds maximum occupancy of {room.room_type.max_occupancy} for room type {room.room_type.name}."
            )
            
        if current_user.role.value == "guest":
            target_guest_id = current_user.guest_id
        else:
            if not req.guest_id:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="guest_id is required for staff bookings.")
            target_guest_id = req.guest_id
            
        guest = db.query(Guest).filter(Guest.guest_id == target_guest_id).first()
        if not guest:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest profile not found.")
            
        # Overlapping stay check (GiST constraint equivalent)
        overlap = db.query(Booking).filter(
            Booking.room_id == req.room_id,
            Booking.status.not_in([BookingStatusEnum.cancelled, BookingStatusEnum.no_show]),
            Booking.check_in < req.check_out,
            Booking.check_out > req.check_in
        ).first()
        
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "room_unavailable", "message": "That room is not available for the requested dates."}
            )
            
        nights = (req.check_out - req.check_in).days
        total_calculated_rate = Decimal("0.00")
        curr = req.check_in
        while curr < req.check_out:
            plan = db.query(RatePlan).filter(
                RatePlan.property_id == room.property_id,
                RatePlan.room_type_id == room.room_type_id,
                RatePlan.valid_from <= curr,
                RatePlan.valid_to > curr
            ).first()
            if plan:
                total_calculated_rate += Decimal(str(plan.nightly_rate))
            else:
                total_calculated_rate += Decimal("3500.00")
            curr += timedelta(days=1)
            
        avg_nightly_rate = (total_calculated_rate / Decimal(nights)).quantize(Decimal("0.01"))
        
        booking = Booking(
            guest_id=target_guest_id,
            room_id=req.room_id,
            check_in=req.check_in,
            check_out=req.check_out,
            guests_count=req.guests,
            nightly_rate=avg_nightly_rate,
            status=BookingStatusEnum.confirmed
        )
        db.add(booking)
        db.flush()
        
        total_paid = Decimal("0.00")
        if req.deposit:
            dep_amount = Decimal(req.deposit.amount)
            if dep_amount <= 0:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Deposit amount must be positive.")
            if dep_amount > total_calculated_rate:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Deposit cannot exceed total booking amount.")
                
            payment = Payment(
                booking_id=booking.booking_id,
                amount=dep_amount,
                method=PaymentMethodEnum(req.deposit.method),
                reference=req.deposit.reference
            )
            db.add(payment)
            total_paid = dep_amount
            
        db.commit()
        db.refresh(booking)
        
        return format_booking_response(booking, total_paid)

@router.get("/{booking_id}", response_model=BookingSchema, summary="One booking.")
def get_booking(
    booking_id: int = Path(...),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    b = db.query(Booking).join(Room).join(Guest).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    if current_user.role.value == "guest":
        if b.guest_id != current_user.guest_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    elif current_user.role.value in ("staff", "manager"):
        if b.room.property_id != current_user.property_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to other properties forbidden.")
            
    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == b.booking_id).scalar()
    return format_booking_response(b, Decimal(str(paid_sum)))

@router.post("/{booking_id}/check-in", response_model=BookingSchema, summary="Check a guest in.")
def check_in(
    booking_id: int = Path(...),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and current_user.property_id != b.room.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage bookings for another property.")
        
    if b.status != BookingStatusEnum.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "illegal_transition", "message": f"Cannot check in booking with status {b.status.value}.", "current_status": b.status.value, "attempted": "check_in"}
        )
        
    b.status = BookingStatusEnum.checked_in
    db.commit()
    db.refresh(b)
    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == b.booking_id).scalar()
    return format_booking_response(b, Decimal(str(paid_sum)))

@router.post("/{booking_id}/check-out", response_model=BookingSchema, summary="Check a guest out.")
def check_out(
    booking_id: int = Path(...),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and current_user.property_id != b.room.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage bookings for another property.")
        
    if b.status != BookingStatusEnum.checked_in:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "illegal_transition", "message": f"Cannot check out booking with status {b.status.value}.", "current_status": b.status.value, "attempted": "check_out"}
        )
        
    b.status = BookingStatusEnum.checked_out
    db.commit()
    db.refresh(b)
    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == b.booking_id).scalar()
    return format_booking_response(b, Decimal(str(paid_sum)))

@router.post("/{booking_id}/cancel", response_model=BookingSchema, summary="Cancel a booking.")
def cancel_booking(
    booking_id: int = Path(...),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    if current_user.role.value == "guest" and b.guest_id != current_user.guest_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and current_user.property_id != b.room.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot cancel booking for another property.")
        
    if b.status != BookingStatusEnum.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "illegal_transition", "message": f"Cannot cancel booking with status {b.status.value}.", "current_status": b.status.value, "attempted": "cancel"}
        )
        
    b.status = BookingStatusEnum.cancelled
    db.commit()
    db.refresh(b)
    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == b.booking_id).scalar()
    return format_booking_response(b, Decimal(str(paid_sum)))

@router.post("/{booking_id}/no-show", response_model=BookingSchema, summary="Mark a booking as a no-show.")
def mark_no_show(
    booking_id: int = Path(...),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    b = db.query(Booking).join(Room).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
    if current_user.role.value in ("staff", "manager") and current_user.property_id != b.room.property_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot mark no-show for another property.")
        
    if b.status != BookingStatusEnum.confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "illegal_transition", "message": f"Cannot mark no-show for booking with status {b.status.value}.", "current_status": b.status.value, "attempted": "no_show"}
        )
        
    b.status = BookingStatusEnum.no_show
    db.commit()
    db.refresh(b)
    paid_sum = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.booking_id == b.booking_id).scalar()
    return format_booking_response(b, Decimal(str(paid_sum)))
