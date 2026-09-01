def test_review_duplicate_conflict(client, guest_headers):
    # Booking 1 already has review in fixture
    payload = {"rating": 4, "comment": "Duplicate review attempt"}
    res = client.post("/bookings/1/review", json=payload, headers=guest_headers)
    assert res.status_code == 409

def test_review_out_of_bounds_rating_422(client, guest_headers):
    payload = {"rating": 6, "comment": "Invalid rating"}
    res = client.post("/bookings/1/review", json=payload, headers=guest_headers)
    assert res.status_code == 422
