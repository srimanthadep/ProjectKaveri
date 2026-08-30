def test_create_booking_success(client, guest_headers):
    payload = {
        "room_id": 2,
        "check_in": "2026-08-01",
        "check_out": "2026-08-04",
        "guests": 2,
        "deposit": {
            "amount": "4900.00",
            "method": "card"
        }
    }
    res = client.post("/bookings", json=payload, headers=guest_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["room_id"] == 2
    assert data["status"] == "confirmed"
    assert data["nights"] == 3

def test_create_booking_exceed_max_occupancy_422(client, guest_headers):
    # Room 1 is Standard (max_occupancy = 2). Sending 4 guests must fail with 422
    payload = {
        "room_id": 1,
        "check_in": "2026-09-10",
        "check_out": "2026-09-12",
        "guests": 4
    }
    res = client.post("/bookings", json=payload, headers=guest_headers)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "validation_failed"

def test_booking_state_machine_transitions(client, staff_headers):
    # Create booking as staff
    create_res = client.post("/bookings", json={
        "room_id": 3,
        "check_in": "2026-10-01",
        "check_out": "2026-10-03",
        "guests": 1,
        "guest_id": 1
    }, headers=staff_headers)
    assert create_res.status_code == 201
    b_id = create_res.json()["id"]
    
    # 1. Check in
    ci_res = client.post(f"/bookings/{b_id}/check-in", headers=staff_headers)
    assert ci_res.status_code == 200
    assert ci_res.json()["status"] == "checked_in"
    
    # 2. Check out
    co_res = client.post(f"/bookings/{b_id}/check-out", headers=staff_headers)
    assert co_res.status_code == 200
    assert co_res.json()["status"] == "checked_out"
    
    # 3. Illegal transition: cannot cancel after check out
    illegal_res = client.post(f"/bookings/{b_id}/cancel", headers=staff_headers)
    assert illegal_res.status_code == 409
