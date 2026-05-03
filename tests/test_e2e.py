from datetime import date, timedelta


def test_e2e_host_lists_spots_guest_books_and_reviews(client, admin_user, mock_email):
    rh = client.post("/api/auth/register", json={
        "email": "ehost@x.com", "password": "password123", "role": "host",
        "full_name": "EHost", "address": "addr"
    })
    h_headers = {"Authorization": f"Bearer {rh.json()['token']}"}

    rev = client.post("/api/admin/events", json={
        "name": "E2E", "venue_name": "VE2E", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=10)).isoformat(),
        "event_time": "12:00:00", "latitude": 43.06, "longitude": -89.41,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]

    rl = client.post("/api/host/listings", json={
        "title": "Driveway", "number_of_spots": 4, "price_per_spot": 20,
        "address": "addr", "latitude": 43.0650, "longitude": -89.4150,
    }, headers=h_headers)
    lid = rl.json()["id"]

    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    rel = client.post("/api/admin/event_listings", json={
        "event_id": eid, "listing_id": lid, "available_spots": 4,
    }, headers=admin_user["headers"])
    el_id = rel.json()["id"]

    rg = client.post("/api/auth/register", json={
        "email": "eguest@x.com", "password": "password123", "role": "guest",
    })
    g_headers = {"Authorization": f"Bearer {rg.json()['token']}"}

    rs = client.get(f"/api/events/{eid}/spots")
    assert any(s["listing_id"] == lid for s in rs.json())

    rb = client.post("/api/bookings", json={
        "event_listing_id": el_id, "guest_name": "EG", "guest_email": "eguest@x.com",
        "guest_phone": "0", "spots_reserved": 2,
    }, headers=g_headers)
    assert rb.status_code == 201
    bid = rb.json()["id"]

    re = client.get(f"/api/events/{eid}")
    assert re.json()["total_available_spots"] == 2

    templates = [m["template"] for m in mock_email]
    assert "send_new_booking_to_host" in templates
    assert "send_booking_confirmation_to_guest" in templates

    client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])

    rr = client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                     headers=g_headers)
    assert rr.status_code == 201
    assert rr.json()["host_rating"] == 5.0


def test_e2e_guest_cancels_booking_with_refund(client, admin_user, host_user, mock_stripe):
    rev = client.post("/api/admin/events", json={
        "name": "Cancel", "venue_name": "VC2", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=10)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]
    rl = client.post("/api/host/listings", json={
        "title": "L", "number_of_spots": 4, "price_per_spot": 20,
        "address": "a", "latitude": 1, "longitude": 1,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    rel = client.post("/api/admin/event_listings", json={
        "event_id": eid, "listing_id": lid, "available_spots": 4,
    }, headers=admin_user["headers"])
    el_id = rel.json()["id"]

    rb = client.post("/api/bookings", json={
        "event_listing_id": el_id, "guest_name": "G", "guest_email": "gc@x.com",
        "guest_phone": "0", "spots_reserved": 2,
    })
    bid = rb.json()["id"]

    rc = client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": "gc@x.com"})
    assert rc.status_code == 200
    assert rc.json()["refund_percent"] == 1.0

    re = client.get(f"/api/events/{eid}")
    assert re.json()["total_available_spots"] == 4
    rb2 = client.get(f"/api/bookings/{bid}")
    assert rb2.json()["status"] == "cancelled"


def test_e2e_multiple_hosts_same_event(client, admin_user):
    rev = client.post("/api/admin/events", json={
        "name": "Multi", "venue_name": "VM", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=10)).isoformat(),
        "event_time": "12:00:00", "latitude": 43.06, "longitude": -89.41,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]

    listings = []
    for email in ("hostA@x.com", "hostB@x.com"):
        rh = client.post("/api/auth/register", json={
            "email": email, "password": "password123", "role": "host",
            "full_name": email, "address": "addr",
        })
        hh = {"Authorization": f"Bearer {rh.json()['token']}"}
        rl = client.post("/api/host/listings", json={
            "title": email, "number_of_spots": 2, "price_per_spot": 15,
            "address": "addr", "latitude": 43.06, "longitude": -89.41,
        }, headers=hh)
        lid = rl.json()["id"]
        client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                     headers=admin_user["headers"])
        rel = client.post("/api/admin/event_listings", json={
            "event_id": eid, "listing_id": lid, "available_spots": 2,
        }, headers=admin_user["headers"])
        listings.append((hh, rel.json()["id"]))

    rs = client.get(f"/api/events/{eid}/spots")
    assert len(rs.json()) >= 2

    for hh, el_id in listings:
        rb = client.post("/api/bookings", json={
            "event_listing_id": el_id, "guest_name": "G", "guest_email": "g@x.com",
            "guest_phone": "0", "spots_reserved": 1,
        })
        assert rb.status_code == 201

    for hh, _ in listings:
        re = client.get("/api/host/bookings/upcoming", headers=hh)
        assert len(re.json()) == 1


def test_e2e_host_earnings_dashboard(client, admin_user, host_user, approved_listing):
    el_id = approved_listing["event_listing"]["id"]
    bids = []
    for _ in range(3):
        rb = client.post("/api/bookings", json={
            "event_listing_id": el_id, "guest_name": "G", "guest_email": "g@x.com",
            "guest_phone": "0", "spots_reserved": 1,
        })
        bids.append(rb.json()["id"])
    # complete 2 of 3
    for bid in bids[:2]:
        client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])
    r = client.get("/api/host/earnings", headers=host_user["headers"])
    data = r.json()
    assert data["total_earned"] > 0
    assert data["pending"] > 0
    assert data["total_earned"] != data["pending"]
