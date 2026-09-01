from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.domain import Booking, Review, Room, Guest, BookingStatusEnum
from app.models.auth import Account
from app.schemas.review import ReviewCreate, Review as ReviewSchema, ReviewPage
from app.schemas.common import PageMeta
from app.dependencies import get_current_user, require_role

router = APIRouter(tags=["reviews"])

@router.post(
    "/bookings/{booking_id}/review",
    response_model=ReviewSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Review a completed stay."
)
def create_review(
    req: ReviewCreate,
    booking_id: int = Path(...),
    current_user: Account = Depends(require_role("guest")),
    db: Session = Depends(get_db)
):
    """
    Post-stay guest review (Task 5.8, Rule 9).
    - Reviewing someone else's stay: 404 Not Found.
    - Reviewing own stay before checked out: 403 Forbidden.
    - Duplicate review on same booking: 409 Conflict.
    - Rating outside 1-5: 422 Unprocessable Entity.
    """
    b = db.query(Booking).join(Guest).filter(Booking.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    # Isolation: guest can only review own booking
    if b.guest_id != current_user.guest_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found.")
        
    # Check if stay is completed
    if b.status != BookingStatusEnum.checked_out:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reviews may only be submitted after check-out has occurred."
        )
        
    # Check duplicate review
    existing = db.query(Review).filter(Review.booking_id == booking_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This booking has already been reviewed."
        )
        
    review = Review(
        booking_id=booking_id,
        rating=req.rating,
        comments=req.comment
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return ReviewSchema(
        id=review.review_id,
        booking_id=review.booking_id,
        rating=review.rating,
        comment=review.comments,
        guest_name=b.guest.full_name,
        created_at=review.reviewed_at
    )

@router.get(
    "/properties/{property_id}/reviews",
    response_model=ReviewPage,
    summary="Reviews for a property."
)
def list_property_reviews(
    property_id: int = Path(...),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Public reviews for a property.
    Guest names are shortened (e.g. 'Aarav S.') to protect guest privacy (Task 4.6, 4.8).
    """
    total = (
        db.query(func.count(Review.review_id))
        .join(Booking, Review.booking_id == Booking.booking_id)
        .join(Room, Booking.room_id == Room.room_id)
        .filter(Room.property_id == property_id)
        .scalar()
    )
    
    reviews = (
        db.query(Review, Guest.full_name)
        .join(Booking, Review.booking_id == Booking.booking_id)
        .join(Room, Booking.room_id == Room.room_id)
        .join(Guest, Booking.guest_id == Guest.guest_id)
        .filter(Room.property_id == property_id)
        .order_by(Review.reviewed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    items = []
    for r, full_name in reviews:
        # Shorten name
        parts = full_name.strip().split()
        shortened = f"{parts[0]} {parts[1][0]}." if len(parts) > 1 else parts[0]
        items.append(
            ReviewSchema(
                id=r.review_id,
                booking_id=r.booking_id,
                rating=r.rating,
                comment=r.comments,
                guest_name=shortened,
                created_at=r.reviewed_at
            )
        )
        
    return ReviewPage(
        items=items,
        meta=PageMeta(limit=limit, offset=offset, total=total or 0)
    )
