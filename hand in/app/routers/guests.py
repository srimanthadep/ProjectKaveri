from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.domain import Guest, Booking
from app.models.auth import Account
from app.schemas.guest import Guest as GuestSchema, GuestPage
from app.schemas.common import PageMeta
from app.dependencies import require_role

router = APIRouter(prefix="/guests", tags=["guests"])

def _normalize_phone_digits(raw: Optional[str]) -> str:
    """Strip everything but digits, then keep the last 10 (national number,
    ignoring country code) so '+91 98765 43210' and '919876543210' match."""
    if not raw:
        return ""
    digits = "".join(ch for ch in raw if ch.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits

@router.get("", response_model=GuestPage, summary="Guest records.")
def list_guests(
    email: Optional[str] = Query(None, description="Exact match, case-insensitive."),
    phone: Optional[str] = Query(None, description="Matched by last 10 digits, ignoring formatting and country code."),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    """
    Staff and above only.
    No endpoint exists through which a guest can list, search, or count other guests (Task 4.8).

    `phone` powers reverse lookup from external channels (e.g. the WhatsApp
    concierge service) that receive a raw MSISDN and need to resolve it to a
    guest record. Comparison happens in Python since guest counts are small;
    if this table grows large, add a normalized indexed phone column instead.
    """
    query = db.query(Guest)
    if email:
        clean_email = email.strip().lower()
        query = query.filter(func.lower(func.trim(Guest.email)) == clean_email)

    if phone:
        target_digits = _normalize_phone_digits(phone)
        if target_digits:
            candidates = query.filter(Guest.phone.isnot(None)).all()
            matching_ids = [
                g.guest_id for g in candidates
                if _normalize_phone_digits(g.phone) == target_digits
            ]
            query = db.query(Guest).filter(Guest.guest_id.in_(matching_ids))
        else:
            query = query.filter(Guest.guest_id.is_(None))  # malformed phone -> no results

    total = query.count()
    guests = query.order_by(Guest.guest_id).offset(offset).limit(limit).all()
    
    # Single aggregate query for all stay counts instead of N+1 per guest
    guest_ids = [g.guest_id for g in guests]
    stay_counts: dict[int, int] = {}
    if guest_ids:
        rows = (
            db.query(Booking.guest_id, func.count(Booking.booking_id))
            .filter(Booking.guest_id.in_(guest_ids))
            .group_by(Booking.guest_id)
            .all()
        )
        stay_counts = {gid: cnt for gid, cnt in rows}
    
    items = [
        GuestSchema(
            id=g.guest_id,
            email=g.email,
            full_name=g.full_name,
            phone=g.phone,
            stay_count=stay_counts.get(g.guest_id, 0)
        )
        for g in guests
    ]
        
    return GuestPage(
        items=items,
        meta=PageMeta(limit=limit, offset=offset, total=total)
    )

@router.get("/{guest_id}", response_model=GuestSchema, summary="One guest record.")
def get_guest(
    guest_id: int = Path(...),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    """Staff and above only. Inspect a single guest profile."""
    g = db.query(Guest).filter(Guest.guest_id == guest_id).first()
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Guest not found.")
        
    stay_count = db.query(func.count(Booking.booking_id)).filter(Booking.guest_id == g.guest_id).scalar()
    return GuestSchema(
        id=g.guest_id,
        email=g.email,
        full_name=g.full_name,
        phone=g.phone,
        stay_count=stay_count or 0
    )
