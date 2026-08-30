def test_occupancy_report_manager(client, manager_headers):
    res = client.get("/reports/occupancy?from=2026-01-01&to=2026-06-01", headers=manager_headers)
    assert res.status_code == 200
    assert "items" in res.json()

def test_adr_report_manager(client, manager_headers):
    res = client.get("/reports/adr?from=2026-01-01&to=2026-06-01", headers=manager_headers)
    assert res.status_code == 200
    assert "items" in res.json()

def test_revpar_report_manager(client, manager_headers):
    res = client.get("/reports/revpar?from=2026-01-01&to=2026-06-01", headers=manager_headers)
    assert res.status_code == 200
    assert "items" in res.json()

def test_revenue_report_owner_only(client, owner_headers, manager_headers):
    # Owner gets 200
    res_owner = client.get("/reports/revenue?from=2026-01-01&to=2026-06-01", headers=owner_headers)
    assert res_owner.status_code == 200
    assert "grand_total" in res_owner.json()
    
    # Manager gets 403 Forbidden (Attack 8.7 / Cross-property restriction)
    res_mgr = client.get("/reports/revenue?from=2026-01-01&to=2026-06-01", headers=manager_headers)
    assert res_mgr.status_code == 403
