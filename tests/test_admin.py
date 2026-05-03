from datetime import date, timedelta


def test_admin_can_approve_listing(client, admin_user, host_listing):
    r = client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                     json={"status": "approved"}, headers=admin_user["headers"])
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_admin_can_reject_listing(client, admin_user, host_listing):
    r = client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                     json={"status": "rejected", "reason": "missing photos"},
                     headers=admin_user["headers"])
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_non_admin_cannot_approve_listing(client, host_user, host_listing):
    r = client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                     json={"status": "approved"}, headers=host_user["headers"])
    assert r.status_code == 403


def test_admin_can_view_pending_listings(client, admin_user, host_listing):
    r = client.get("/api/admin/listings?status=pending", headers=admin_user["headers"])
    assert r.status_code == 200
    statuses = {l["status"] for l in r.json()}
    assert statuses == {"pending"} or len(r.json()) >= 1


def test_admin_can_view_all_bookings(client, admin_user, approved_listing):
    client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "G", "guest_email": "g@x.com", "guest_phone": "0",
        "spots_reserved": 1,
    })
    r = client.get("/api/admin/bookings", headers=admin_user["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_admin_can_view_revenue_summary(client, admin_user, approved_listing):
    client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "G", "guest_email": "g@x.com", "guest_phone": "0",
        "spots_reserved": 2,
    })
    r = client.get("/api/admin/analytics/revenue", headers=admin_user["headers"])
    assert r.status_code == 200
    data = r.json()
    assert "total_commission" in data
    assert "total_bookings" in data
    assert "total_gross" in data
    assert data["total_bookings"] >= 1


def test_admin_can_handle_dispute(client, admin_user, approved_listing):
    rb = client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "G", "guest_email": "g@x.com", "guest_phone": "0",
        "spots_reserved": 1,
    })
    bid = rb.json()["id"]
    r = client.post("/api/admin/disputes",
                    json={"booking_id": bid, "resolution": "refunded"},
                    headers=admin_user["headers"])
    assert r.status_code == 201


def test_admin_can_create_event(client, admin_user):
    r = client.post("/api/admin/events", json={
        "name": "WI vs MI",
        "venue_name": "Camp Randall",
        "venue_address": "300 Spence",
        "event_date": (date.today() + timedelta(days=30)).isoformat(),
        "event_time": "12:00:00",
        "latitude": 43.0, "longitude": -89.0,
    }, headers=admin_user["headers"])
    assert r.status_code == 201


def test_admin_can_delete_event(client, admin_user, event):
    r = client.delete(f"/api/admin/events/{event['id']}", headers=admin_user["headers"])
    assert r.status_code == 200


def test_admin_can_view_event_bookings(client, admin_user, approved_listing):
    client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "G", "guest_email": "g@x.com", "guest_phone": "0",
        "spots_reserved": 1,
    })
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/admin/events/{eid}/bookings", headers=admin_user["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1
