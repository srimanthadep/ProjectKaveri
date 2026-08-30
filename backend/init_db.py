import os
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

from app.db import Base, engine, SessionLocal
from app.models.domain import (
    Property, RoomType, Room, Guest, RatePlan, Booking, Payment, Review,
    BookingStatusEnum, PaymentMethodEnum
)
from app.models.auth import Account, RoleEnum
from app.security import hash_password

def seed_database():
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if already seeded
    if db.query(Property).count() > 0:
        print("Database already populated.")
        db.close()
        return

    print("Seeding properties...")
    p1 = Property(property_id=1, name="Kaveri Riverside", city="Coorg", star_rating=4)
    p2 = Property(property_id=2, name="Kaveri Hilltop", city="Ooty", star_rating=5)
    p3 = Property(property_id=3, name="Kaveri Backwater", city="Alleppey", star_rating=4)
    db.add_all([p1, p2, p3])
    db.flush()

    print("Seeding room types...")
    rt1 = RoomType(room_type_id=1, name="Standard", max_occupancy=2)
    rt2 = RoomType(room_type_id=2, name="Deluxe", max_occupancy=3)
    rt3 = RoomType(room_type_id=3, name="Suite", max_occupancy=4)
    db.add_all([rt1, rt2, rt3])
    db.flush()

    print("Seeding rooms (12 per property)...")
    rooms = []
    for pid in [1, 2, 3]:
        for r_num in ["101", "102", "103", "104"]:
            rooms.append(Room(property_id=pid, room_number=r_num, room_type_id=1))
        for r_num in ["201", "202", "203", "204"]:
            rooms.append(Room(property_id=pid, room_number=r_num, room_type_id=2))
        for r_num in ["301", "302", "303", "304"]:
            rooms.append(Room(property_id=pid, room_number=r_num, room_type_id=3))
    db.add_all(rooms)
    db.flush()

    print("Seeding seasonal rate plans...")
    rate_plans = []
    for pid in [1, 2, 3]:
        # Standard
        rate_plans.append(RatePlan(property_id=pid, room_type_id=1, season_name="Regular 2025-2026", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("3500.00")))
        # Deluxe
        rate_plans.append(RatePlan(property_id=pid, room_type_id=2, season_name="Regular 2025-2026", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("4900.00")))
        # Suite
        rate_plans.append(RatePlan(property_id=pid, room_type_id=3, season_name="Regular 2025-2026", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("7350.00")))
    db.add_all(rate_plans)
    db.flush()

    print("Seeding guests...")
    guests = [
        Guest(guest_id=1, full_name="Aarav Sharma", email="aarav.sharma@example.com", phone="+91 98765 43210", city="Bengaluru"),
        Guest(guest_id=2, full_name="Anita Desai", email="anita.desai@example.com", phone="+91 91234 56789", city="Mumbai"),
        Guest(guest_id=3, full_name="Ben Carter", email="ben.carter@example.org", phone="+44 7700 900123", city="Bristol"),
        Guest(guest_id=4, full_name="Chloe Dubois", email="chloe.dubois@example.com", phone="+33 6 12 34 56 78", city="Lyon"),
        Guest(guest_id=5, full_name="Elena Rossi", email="elena.rossi@example.com", phone="+39 320 1234567", city="Milan"),
        Guest(guest_id=6, full_name="Kavya Nair", email="kavya.nair@example.com", phone="+91 94567 89012", city="Kochi")
    ]
    db.add_all(guests)
    db.flush()

    print("Seeding demo accounts for all 4 roles...")
    pwd_hash = hash_password("DemoPassword123!")
    accounts = [
        Account(email="guest@kaveristays.com", password_hash=pwd_hash, role=RoleEnum.guest, guest_id=1, is_active=True),
        Account(email="staff.coorg@kaveristays.com", password_hash=pwd_hash, role=RoleEnum.staff, property_id=1, is_active=True),
        Account(email="manager.coorg@kaveristays.com", password_hash=pwd_hash, role=RoleEnum.manager, property_id=1, is_active=True),
        Account(email="manager.ooty@kaveristays.com", password_hash=pwd_hash, role=RoleEnum.manager, property_id=2, is_active=True),
        Account(email="owner@kaveristays.com", password_hash=pwd_hash, role=RoleEnum.owner, is_active=True)
    ]
    db.add_all(accounts)
    db.flush()

    print("Seeding WhatsApp concierge service account...")
    # Dedicated machine account for the whatsapp-service Node process. Uses the
    # existing owner role so it can resolve guests and bookings across every
    # property (a guest may have stayed at any of the three). Never exposed
    # through any UI — credentials live only in whatsapp-service/.env.
    wa_service_pwd_hash = hash_password(os.getenv("WHATSAPP_SERVICE_PASSWORD", "ConciergeService2026!Bot"))
    accounts.append(
        Account(
            email="whatsapp.service@kaveristays.internal",
            password_hash=wa_service_pwd_hash,
            role=RoleEnum.owner,
            is_active=True,
        )
    )
    db.add(accounts[-1])
    db.flush()

    print("Seeding sample bookings, payments, and reviews...")
    # Past completed booking with review
    b1 = Booking(
        guest_id=1,
        room_id=1,
        check_in=date(2026, 1, 10),
        check_out=date(2026, 1, 14),
        guests_count=2,
        nightly_rate=Decimal("3500.00"),
        status=BookingStatusEnum.checked_out
    )
    db.add(b1)
    db.flush()

    p1 = Payment(booking_id=b1.booking_id, amount=Decimal("14000.00"), method=PaymentMethodEnum.card, idempotency_key="init_payment_001")
    r1 = Review(booking_id=b1.booking_id, rating=5, comments="Fantastic peaceful experience by the river in Coorg.")
    db.add_all([p1, r1])

    # Upcoming confirmed booking
    b2 = Booking(
        guest_id=2,
        room_id=5, # Deluxe room at Coorg
        check_in=date(2026, 9, 15),
        check_out=date(2026, 9, 18),
        guests_count=2,
        nightly_rate=Decimal("4900.00"),
        status=BookingStatusEnum.confirmed
    )
    db.add(b2)
    db.flush()
    p2 = Payment(booking_id=b2.booking_id, amount=Decimal("4900.00"), method=PaymentMethodEnum.upi, idempotency_key="init_deposit_002")
    db.add(p2)

    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
