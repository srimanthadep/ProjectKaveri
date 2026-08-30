from datetime import date, timedelta
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.db import get_db
from app.models.domain import Property, Room, RoomType, RatePlan, Booking, BookingStatusEnum
from app.models.auth import Account
from app.schemas.property import (
    Property as PropertySchema, PropertyListResponse, Room as RoomSchema,
    RoomType as RoomTypeSchema, RoomPage, AvailableRoom, AvailabilityResponse, RoomTypeName
)
from app.schemas.common import PageMeta
from app.dependencies import get_current_user, require_role, verify_property_access

router = APIRouter(prefix="/properties", tags=["properties"])

@router.get("", response_model=PropertyListResponse, summary="All properties.")
def list_properties(db: Session = Depends(get_db)):
    """Public catalog of all hotel properties."""
    props = db.query(Property).order_by(Property.property_id).all()
    items = [
        PropertySchema(
            id=p.property_id,
            name=p.name,
            city=p.city,
            stars=p.star_rating
        )
        for p in props
    ]
    return PropertyListResponse(items=items)

@router.get("/{property_id}", response_model=PropertySchema, summary="One property.")
def get_property(
    property_id: int = Path(..., description="Property ID"),
    db: Session = Depends(get_db)
):
    """Get single property details."""
    p = db.query(Property).filter(Property.property_id == property_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")
    return PropertySchema(
        id=p.property_id,
        name=p.name,
        city=p.city,
        stars=p.star_rating
    )

@router.get("/{property_id}/rooms", response_model=RoomPage, summary="Full room inventory for a property.")
def list_rooms(
    property_id: int = Path(...),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Account = Depends(require_role("staff", "manager", "owner")),
    db: Session = Depends(get_db)
):
    """
    List physical room inventory for a property (Task 4.7).
    Must show all rooms including rooms that have never been booked.
    Staff/Manager scoped to assigned property; Owner cross-property.
    """
    verify_property_access(property_id, current_user)
    
    p = db.query(Property).filter(Property.property_id == property_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")
        
    total = db.query(func.count(Room.room_id)).filter(Room.property_id == property_id).scalar()
    
    rooms = (
        db.query(Room)
        .join(RoomType, Room.room_type_id == RoomType.room_type_id)
        .filter(Room.property_id == property_id)
        .order_by(Room.room_number)
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    items = [
        RoomSchema(
            id=r.room_id,
            property_id=r.property_id,
            room_number=r.room_number,
            room_type=RoomTypeSchema(
                name=r.room_type.name,
                max_occupancy=r.room_type.max_occupancy
            )
        )
        for r in rooms
    ]
    
    return RoomPage(
        items=items,
        meta=PageMeta(limit=limit, offset=offset, total=total or 0)
    )

@router.get("/{property_id}/availability", response_model=AvailabilityResponse, summary="Rooms free for a whole date range.")
def get_availability(
    property_id: int = Path(...),
    from_: date = Query(..., alias="from", description="First night of stay, inclusive."),
    to: date = Query(..., description="Departure date, exclusive. Must be strictly after from."),
    room_type: Optional[RoomTypeName] = Query(None, description="Optional room type filter."),
    db: Session = Depends(get_db)
):
    """
    Query free rooms for date range [from, to) (Task 4.1).
    Half-open interval: checkout date is free for same-day check-in.
    Cancelled and no-show bookings do not block rooms.
    """
    if to <= from_:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The 'to' date must be strictly after the 'from' date."
        )
        
    prop = db.query(Property).filter(Property.property_id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")
        
    # Subquery: occupied rooms in [from_, to)
    # A booking [check_in, check_out) overlaps [from_, to) if (check_in < to) AND (check_out > from_)
    occupied_subquery = (
        db.query(Booking.room_id)
        .filter(
            Booking.status.not_in([BookingStatusEnum.cancelled, BookingStatusEnum.no_show]),
            Booking.check_in < to,
            Booking.check_out > from_
        )
    )
    
    # Query available rooms
    room_query = (
        db.query(Room)
        .join(RoomType, Room.room_type_id == RoomType.room_type_id)
        .filter(
            Room.property_id == property_id,
            Room.room_id.not_in(occupied_subquery)
        )
    )
    
    if room_type:
        room_query = room_query.filter(RoomType.name == room_type)
        
    available_rooms = room_query.order_by(Room.room_number).all()
    
    nights = (to - from_).days
    
    # Calculate price per room based on rate_plans
    items = []
    for r in available_rooms:
        # Resolve seasonal rate per night
        total_rate = Decimal("0.00")
        curr = from_
        while curr < to:
            plan = (
                db.query(RatePlan)
                .filter(
                    RatePlan.property_id == property_id,
                    RatePlan.room_type_id == r.room_type_id,
                    RatePlan.valid_from <= curr,
                    RatePlan.valid_to > curr
                )
                .first()
            )
            if plan:
                total_rate += Decimal(str(plan.nightly_rate))
            else:
                # Fallback standard calculation
                total_rate += Decimal("3500.00")
            curr += timedelta(days=1)
            
        items.append(
            AvailableRoom(
                room_id=r.room_id,
                room_number=r.room_number,
                room_type=RoomTypeSchema(
                    name=r.room_type.name,
                    max_occupancy=r.room_type.max_occupancy
                ),
                nights=nights,
                total_rate=f"{total_rate:.2f}"
            )
        )
        
    return AvailabilityResponse(
        property_id=property_id,
        from_=from_,
        to=to,
        items=items
    )
