import enum
from datetime import datetime, timezone, date
from sqlalchemy import (
    Column, Integer, SmallInteger, String, Numeric, Text, ForeignKey,
    DateTime, Date, Enum as SAEnum, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.db import Base

class BookingStatusEnum(str, enum.Enum):
    confirmed = "confirmed"
    checked_in = "checked_in"
    checked_out = "checked_out"
    cancelled = "cancelled"
    no_show = "no_show"

class PaymentMethodEnum(str, enum.Enum):
    card = "card"
    upi = "upi"
    bank_transfer = "bank_transfer"
    cash = "cash"

class Property(Base):
    __tablename__ = "properties"
    
    property_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    city = Column(String(100), nullable=False)
    star_rating = Column(SmallInteger, nullable=False)
    
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    rate_plans = relationship("RatePlan", back_populates="property", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="property")

class RoomType(Base):
    __tablename__ = "room_types"
    
    room_type_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    max_occupancy = Column(SmallInteger, nullable=False)
    
    rooms = relationship("Room", back_populates="room_type")
    rate_plans = relationship("RatePlan", back_populates="room_type")

class Room(Base):
    __tablename__ = "rooms"
    
    room_id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.property_id", ondelete="RESTRICT"), nullable=False)
    room_number = Column(String(10), nullable=False)
    room_type_id = Column(Integer, ForeignKey("room_types.room_type_id", ondelete="RESTRICT"), nullable=False)
    
    property = relationship("Property", back_populates="rooms")
    room_type = relationship("RoomType", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")
    
    __table_args__ = (
        UniqueConstraint("property_id", "room_number", name="uq_property_room_number"),
    )

class Guest(Base):
    __tablename__ = "guests"
    
    guest_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(30), nullable=True)
    city = Column(String(100), nullable=True)
    
    bookings = relationship("Booking", back_populates="guest")
    account = relationship("Account", back_populates="guest", uselist=False)

class RatePlan(Base):
    __tablename__ = "rate_plans"
    
    rate_plan_id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.property_id", ondelete="CASCADE"), nullable=False)
    room_type_id = Column(Integer, ForeignKey("room_types.room_type_id", ondelete="CASCADE"), nullable=False)
    season_name = Column(String(50), nullable=True)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    nightly_rate = Column(Numeric(10, 2), nullable=False)
    
    property = relationship("Property", back_populates="rate_plans")
    room_type = relationship("RoomType", back_populates="rate_plans")

class Booking(Base):
    __tablename__ = "bookings"
    
    booking_id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.guest_id", ondelete="RESTRICT"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id", ondelete="RESTRICT"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    guests_count = Column(SmallInteger, nullable=False)
    nightly_rate = Column(Numeric(10, 2), nullable=False)
    status = Column(SAEnum(BookingStatusEnum, name="booking_status", values_callable=lambda x: [e.value for e in x]), nullable=False, default=BookingStatusEnum.confirmed)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    guest = relationship("Guest", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"
    
    payment_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(SAEnum(PaymentMethodEnum, name="payment_method_type", values_callable=lambda x: [e.value for e in x]), nullable=False)
    reference = Column(String(255), nullable=True)
    idempotency_key = Column(String(100), nullable=True, unique=True, index=True)
    paid_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    booking = relationship("Booking", back_populates="payments")

class Review(Base):
    __tablename__ = "reviews"
    
    review_id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.booking_id", ondelete="CASCADE"), nullable=False, unique=True)
    rating = Column(SmallInteger, nullable=False)
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    booking = relationship("Booking", back_populates="review")
