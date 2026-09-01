import os
import pytest
from datetime import date, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["SECRET_KEY"] = "super_secret_test_key_for_kaveri_stays_pytest_suite_32chars"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.db import Base, get_db
from app.main import app
from app.models.auth import Account, RoleEnum, RefreshToken
from app.models.domain import (
    Property, RoomType, Room, Guest, RatePlan, Booking, Payment, Review,
    BookingStatusEnum, PaymentMethodEnum
)
from app.security import hash_password, create_access_token

# In-memory test engine
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    
    # 1. Properties
    p1 = Property(property_id=1, name="Kaveri Riverside", city="Coorg", star_rating=4)
    p2 = Property(property_id=2, name="Kaveri Hilltop", city="Ooty", star_rating=5)
    p3 = Property(property_id=3, name="Kaveri Backwater", city="Alleppey", star_rating=4)
    db.add_all([p1, p2, p3])
    
    # 2. Room Types
    rt1 = RoomType(room_type_id=1, name="Standard", max_occupancy=2)
    rt2 = RoomType(room_type_id=2, name="Deluxe", max_occupancy=3)
    rt3 = RoomType(room_type_id=3, name="Suite", max_occupancy=4)
    db.add_all([rt1, rt2, rt3])
    db.flush()
    
    # 3. Rooms
    rooms = [
        Room(room_id=1, property_id=1, room_number="101", room_type_id=1),
        Room(room_id=2, property_id=1, room_number="102", room_type_id=2),
        Room(room_id=3, property_id=1, room_number="103", room_type_id=1),
        Room(room_id=4, property_id=2, room_number="201", room_type_id=3),
        Room(room_id=5, property_id=3, room_number="301", room_type_id=2),
    ]
    db.add_all(rooms)
    
    # 4. Rate Plans
    plans = [
        RatePlan(rate_plan_id=1, property_id=1, room_type_id=1, season_name="Regular", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("3500.00")),
        RatePlan(rate_plan_id=2, property_id=1, room_type_id=2, season_name="Regular", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("4900.00")),
        RatePlan(rate_plan_id=3, property_id=2, room_type_id=3, season_name="Regular", valid_from=date(2025, 1, 1), valid_to=date(2027, 1, 1), nightly_rate=Decimal("7500.00")),
    ]
    db.add_all(plans)
    
    # 5. Guests
    g1 = Guest(guest_id=1, full_name="Aarav Sharma", email="aarav.sharma@example.com", phone="+91 98765 43210", city="Bengaluru")
    g2 = Guest(guest_id=2, full_name="Anita Desai", email="anita.desai@example.com", phone="+91 91234 56789", city="Mumbai")
    db.add_all([g1, g2])
    db.flush()
    
    # 6. Accounts
    pwd = hash_password("TestPassword123!")
    acc_guest = Account(account_id=1, email="aarav.sharma@example.com", password_hash=pwd, role=RoleEnum.guest, guest_id=1, is_active=True)
    acc_staff = Account(account_id=2, email="staff.coorg@kaveristays.com", password_hash=pwd, role=RoleEnum.staff, property_id=1, is_active=True)
    acc_mgr = Account(account_id=3, email="manager.coorg@kaveristays.com", password_hash=pwd, role=RoleEnum.manager, property_id=1, is_active=True)
    acc_owner = Account(account_id=4, email="owner@kaveristays.com", password_hash=pwd, role=RoleEnum.owner, is_active=True)
    acc_ooty_mgr = Account(account_id=5, email="manager.ooty@kaveristays.com", password_hash=pwd, role=RoleEnum.manager, property_id=2, is_active=True)
    db.add_all([acc_guest, acc_staff, acc_mgr, acc_owner, acc_ooty_mgr])
    
    # 7. Sample Booking
    b1 = Booking(
        booking_id=1,
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
    
    # 8. Sample Payment & Review
    pay1 = Payment(payment_id=1, booking_id=1, amount=Decimal("14000.00"), method=PaymentMethodEnum.card, idempotency_key="init_key_001")
    rev1 = Review(review_id=1, booking_id=1, rating=5, comments="Wonderful stay!")
    db.add_all([pay1, rev1])
    
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def guest_headers():
    token = create_access_token({"sub": "1", "role": "guest", "gid": 1, "prop": None})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def staff_headers():
    token = create_access_token({"sub": "2", "role": "staff", "gid": None, "prop": 1})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def manager_headers():
    token = create_access_token({"sub": "3", "role": "manager", "gid": None, "prop": 1})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def ooty_manager_headers():
    token = create_access_token({"sub": "5", "role": "manager", "gid": None, "prop": 2})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def owner_headers():
    token = create_access_token({"sub": "4", "role": "owner", "gid": None, "prop": None})
    return {"Authorization": f"Bearer {token}"}
