"""
Grounded context builders for the Gemini floating assistant.

Same security boundary as the WhatsApp concierge bot: the model never gets
database access or query tools. Each role gets a small, explicitly-scoped
JSON object built here in Python, and that object — nothing else — is
serialized into the prompt. A guest's context can only ever contain that
guest's own bookings; staff/manager context is scoped to their own
property; only the owner's context spans all three properties.
"""
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.auth import Account
from app.models.domain import Booking, Room, Property, Payment, BookingStatusEnum


def _booking_summary(b: Booking) -> dict:
    nights = (b.check_out - b.check_in).days
    return {
        "bookingId": b.booking_id,
        "property": b.room.property.name,
        "roomNumber": b.room.room_number,
        "checkIn": b.check_in.isoformat(),
        "checkOut": b.check_out.isoformat(),
        "nights": nights,
        "status": b.status.value,
        "guests": b.guests_count,
    }


def build_guest_context(db: Session, account: Account) -> dict[str, Any]:
    bookings = (
        db.query(Booking)
        .join(Room)
        .filter(Booking.guest_id == account.guest_id)
        .order_by(Booking.check_in.desc())
        .limit(5)
        .all()
    )
    return {
        "role": "guest",
        "guestName": account.guest.full_name if account.guest else None,
        "bookings": [_booking_summary(b) for b in bookings],
    }


def build_staff_context(db: Session, account: Account) -> dict[str, Any]:
    prop = db.query(Property).filter(Property.property_id == account.property_id).first()
    today_checkins = (
        db.query(func.count(Booking.booking_id))
        .join(Room)
        .filter(
            Room.property_id == account.property_id,
            Booking.status == BookingStatusEnum.confirmed,
        )
        .scalar()
    )
    return {
        "role": "staff",
        "property": prop.name if prop else None,
        "confirmedUpcomingBookings": today_checkins or 0,
    }


def build_manager_context(db: Session, account: Account) -> dict[str, Any]:
    prop = db.query(Property).filter(Property.property_id == account.property_id).first()
    total_rooms = db.query(func.count(Room.room_id)).filter(Room.property_id == account.property_id).scalar()
    active_bookings = (
        db.query(func.count(Booking.booking_id))
        .join(Room)
        .filter(
            Room.property_id == account.property_id,
            Booking.status.in_([BookingStatusEnum.confirmed, BookingStatusEnum.checked_in]),
        )
        .scalar()
    )
    return {
        "role": "manager",
        "property": prop.name if prop else None,
        "totalRooms": total_rooms or 0,
        "activeBookings": active_bookings or 0,
    }


def build_owner_context(db: Session) -> dict[str, Any]:
    properties = db.query(Property).all()
    per_property = []
    for p in properties:
        rooms = db.query(func.count(Room.room_id)).filter(Room.property_id == p.property_id).scalar()
        active = (
            db.query(func.count(Booking.booking_id))
            .join(Room)
            .filter(
                Room.property_id == p.property_id,
                Booking.status.in_([BookingStatusEnum.confirmed, BookingStatusEnum.checked_in]),
            )
            .scalar()
        )
        per_property.append({"property": p.name, "totalRooms": rooms or 0, "activeBookings": active or 0})
    return {"role": "owner", "properties": per_property}


def build_context(db: Session, account: Optional[Account]) -> dict[str, Any]:
    """Dispatches to the right scoped builder based on the caller's role.
    Anonymous (unauthenticated) visitors get a minimal public context."""
    if account is None:
        return {"role": "public"}

    role = account.role.value
    if role == "guest":
        return build_guest_context(db, account)
    if role == "staff":
        return build_staff_context(db, account)
    if role == "manager":
        return build_manager_context(db, account)
    if role == "owner":
        return build_owner_context(db)
    return {"role": "public"}
