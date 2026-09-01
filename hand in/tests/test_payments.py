def test_payment_idempotency(client, guest_headers):
    # First create a fresh booking with room for payments
    create_res = client.post("/bookings", json={
        "room_id": 2,
        "check_in": "2026-11-20",
        "check_out": "2026-11-24",
        "guests": 2
    }, headers=guest_headers)
    assert create_res.status_code == 201
    b_id = create_res.json()["id"]
    
    # Make a payment with idempotency key
    key = "idem-test-uuid-9999"
    payload = {"amount": "1000.00", "method": "upi"}
    
    res1 = client.post(f"/bookings/{b_id}/payments", json=payload, headers={**guest_headers, "Idempotency-Key": key})
    assert res1.status_code == 201
    
    # Replay with same key and body -> 200 OK
    res2 = client.post(f"/bookings/{b_id}/payments", json=payload, headers={**guest_headers, "Idempotency-Key": key})
    assert res2.status_code == 200
    assert res2.json()["id"] == res1.json()["id"]
    
    # Replay with same key and DIFFERENT body -> 409 Conflict
    diff_payload = {"amount": "2000.00", "method": "card"}
    res3 = client.post(f"/bookings/{b_id}/payments", json=diff_payload, headers={**guest_headers, "Idempotency-Key": key})
    assert res3.status_code == 409
