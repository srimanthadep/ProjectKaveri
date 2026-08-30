def test_list_guests_staff_only(client, staff_headers, guest_headers):
    # Staff can list guests
    res_staff = client.get("/guests", headers=staff_headers)
    assert res_staff.status_code == 200
    assert len(res_staff.json()["items"]) >= 2
    
    # Guest cannot list guests -> 403 Forbidden (Task 4.8)
    res_guest = client.get("/guests", headers=guest_headers)
    assert res_guest.status_code == 403

def test_get_guest_detail(client, staff_headers):
    res = client.get("/guests/1", headers=staff_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "Aarav Sharma"
