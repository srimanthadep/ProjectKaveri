import pytest
import jwt
from app.config import SECRET_KEY

def test_attack_8_1_guest_a_requests_guest_b_booking(client, guest_headers):
    # Guest 1 requests non-existent or other guest booking -> 404 (no existence leak)
    res = client.get("/bookings/999", headers=guest_headers)
    assert res.status_code == 404

def test_attack_8_2_register_with_role_owner(client):
    payload = {
        "email": "hacker@example.com",
        "password": "Password123!",
        "full_name": "Hacker",
        "role": "owner"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422

def test_attack_8_3_token_algorithm_none(client):
    # Craft token with alg: none
    fake_token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwicm9sZSI6Im93bmVyIiwiaWF0IjoxNTAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDAsImp0aSI6ImZvcmdlZCJ9."
    res = client.get("/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert res.status_code == 401

def test_attack_8_4_token_wrong_secret(client):
    bad_token = jwt.encode({"sub": "1", "role": "owner", "exp": 2500000000, "iat": 1500000000, "jti": "bad"}, "wrong_secret_12345678901234567890", algorithm="HS256")
    res = client.get("/me", headers={"Authorization": f"Bearer {bad_token}"})
    assert res.status_code == 401

def test_attack_8_5_expired_token(client):
    expired = jwt.encode({"sub": "1", "role": "guest", "exp": 1000000000, "iat": 900000000, "jti": "exp"}, SECRET_KEY, algorithm="HS256")
    res = client.get("/me", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401

def test_attack_8_7_ooty_manager_coorg_reports(client, ooty_manager_headers):
    # Ooty manager requesting Coorg (property_id=1)
    res = client.get("/reports/occupancy?from=2026-01-01&to=2026-02-01&property_id=1", headers=ooty_manager_headers)
    assert res.status_code == 403

def test_attack_8_8_client_supplied_nightly_rate(client, guest_headers):
    payload = {
        "room_id": 1,
        "check_in": "2026-11-01",
        "check_out": "2026-11-04",
        "guests": 2,
        "nightly_rate": "1.00"
    }
    res = client.post("/bookings", json=payload, headers=guest_headers)
    assert res.status_code == 422

def test_attack_8_11_sql_injection_sort_param(client, guest_headers):
    res = client.get("/bookings?sort=check_in;DROP TABLE guests;", headers=guest_headers)
    assert res.status_code == 422
