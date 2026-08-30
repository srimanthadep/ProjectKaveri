import concurrent.futures
from app.security import create_access_token

def test_concurrency_overlapping_bookings(client):
    """
    Task 8.10 & 8.19: True multi-threaded concurrency test.
    Two simultaneous POST /bookings requests for the same room and overlapping dates.
    One must return 201 Created and the other must return 409 Conflict.
    """
    token = create_access_token({"sub": "1", "role": "guest", "gid": 1, "prop": None})
    headers = {"Authorization": f"Bearer {token}"}
    
    payload1 = {
        "room_id": 3,
        "check_in": "2026-12-01",
        "check_out": "2026-12-05",
        "guests": 1
    }
    payload2 = {
        "room_id": 3,
        "check_in": "2026-12-03",
        "check_out": "2026-12-07",
        "guests": 1
    }
    
    def send_booking(payload):
        return client.post("/bookings", json=payload, headers=headers)
        
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(send_booking, payload1)
        f2 = executor.submit(send_booking, payload2)
        r1 = f1.result()
        r2 = f2.result()
        
    status_codes = sorted([r1.status_code, r2.status_code])
    assert 201 in status_codes
    assert 409 in status_codes
