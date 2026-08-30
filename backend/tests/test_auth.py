import pytest

def test_register_guest_success(client):
    payload = {
        "email": "new.guest@example.com",
        "password": "SecurePassword123!",
        "full_name": "New Guest",
        "phone": "+91 99000 11223"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new.guest@example.com"
    assert data["role"] == "guest"
    assert "password_hash" not in data

def test_register_duplicate_email_conflict(client):
    payload = {
        "email": "aarav.sharma@example.com",
        "password": "AnotherPassword123!",
        "full_name": "Aarav Duplicate"
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 409
    assert res.json()["error"]["code"] in ("account_already_exists", "conflict")

def test_login_success_and_token_pair(client):
    payload = {
        "email": "aarav.sharma@example.com",
        "password": "TestPassword123!"
    }
    res = client.post("/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password_401(client):
    payload = {
        "email": "aarav.sharma@example.com",
        "password": "WrongPassword!"
    }
    res = client.post("/auth/login", json=payload)
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthenticated"

def test_refresh_token_rotation(client):
    login_res = client.post("/auth/login", json={"email": "aarav.sharma@example.com", "password": "TestPassword123!"})
    r_token = login_res.json()["refresh_token"]
    
    ref_res = client.post("/auth/refresh", json={"refresh_token": r_token})
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert "access_token" in new_data
    assert new_data["refresh_token"] != r_token

def test_get_me(client, guest_headers):
    res = client.get("/me", headers=guest_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "guest"
