from datetime import date
from decimal import Decimal
from app.models.domain import Booking, BookingStatusEnum

def test_list_properties(client):
    res = client.get("/properties")
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 3

def test_get_property_detail(client):
    res = client.get("/properties/1")
    assert res.status_code == 200
    assert res.json()["name"] == "Kaveri Riverside"

def test_check_availability_same_day_turnover(client, db_session):
    # Ensure Room 1 is booked 2026-01-10 to 2026-01-14
    res = client.get("/properties/1/availability?from=2026-01-14&to=2026-01-18")
    assert res.status_code == 200
    room_ids = [r["room_id"] for r in res.json()["items"]]
    assert 1 in room_ids

def test_check_availability_blocked_during_stay(client):
    # Searching 2026-01-11 to 2026-01-13 should NOT show Room 1
    res = client.get("/properties/1/availability?from=2026-01-11&to=2026-01-13")
    assert res.status_code == 200
    room_ids = [r["room_id"] for r in res.json()["items"]]
    assert 1 not in room_ids

def test_availability_invalid_dates_422(client):
    res = client.get("/properties/1/availability?from=2026-01-15&to=2026-01-10")
    assert res.status_code == 422
