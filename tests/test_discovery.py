from datetime import date, timedelta


def test_public_can_browse_events(client, event):
    r = client.get("/api/events")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_events_sorted_by_date_ascending(client, admin_user):
    e1 = client.post("/api/admin/events", json={
        "name": "Later", "venue_name": "V1", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=20)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    e2 = client.post("/api/admin/events", json={
        "name": "Sooner", "venue_name": "V2", "venue_address": "b",
        "event_date": (date.today() + timedelta(days=5)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    r = client.get("/api/events")
    dates = [e["event_date"] for e in r.json()]
    assert dates == sorted(dates)


def test_events_filtered_by_venue(client, event):
    r = client.get("/api/events?venue=Camp Randall")
    assert r.status_code == 200
    assert all("Camp Randall" in e["venue_name"] for e in r.json())


def test_event_detail_returns_available_spots_count(client, approved_listing):
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/events/{eid}")
    assert r.status_code == 200
    assert r.json()["total_available_spots"] == 4


def test_public_can_browse_spots_for_event(client, approved_listing):
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/events/{eid}/spots")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_spots_sorted_by_price_ascending(client, admin_user, host_user, event):
    for price in (30.0, 10.0, 20.0):
        rl = client.post("/api/host/listings", json={
            "title": f"L{price}", "number_of_spots": 2, "price_per_spot": price,
            "address": "addr", "latitude": 43.0642, "longitude": -89.4142,
        }, headers=host_user["headers"])
        lid = rl.json()["id"]
        client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                     headers=admin_user["headers"])
        client.post("/api/admin/event_listings", json={
            "event_id": event["id"], "listing_id": lid, "available_spots": 2,
        }, headers=admin_user["headers"])
    r = client.get(f"/api/events/{event['id']}/spots?sort=price")
    prices = [s["price_per_spot"] for s in r.json()]
    assert prices == sorted(prices)


def test_spots_filtered_by_max_price(client, approved_listing):
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/events/{eid}/spots?max_price=10")
    assert all(s["price_per_spot"] <= 10 for s in r.json())


def test_spots_filtered_by_min_spots(client, approved_listing):
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/events/{eid}/spots?min_spots=3")
    assert all(s["available_spots"] >= 3 for s in r.json())


def test_spots_filtered_by_radius(client, approved_listing):
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/events/{eid}/spots?radius=5")
    assert r.status_code == 200


def test_rejected_listings_not_visible(client, admin_user, host_user, event):
    rl = client.post("/api/host/listings", json={
        "title": "Reject", "number_of_spots": 2, "price_per_spot": 10,
        "address": "addr", "latitude": 43.0642, "longitude": -89.4142,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "rejected"},
                 headers=admin_user["headers"])
    client.post("/api/admin/event_listings", json={
        "event_id": event["id"], "listing_id": lid, "available_spots": 2,
    }, headers=admin_user["headers"])
    r = client.get(f"/api/events/{event['id']}/spots")
    assert all(s["listing_id"] != lid for s in r.json())


def test_inactive_listings_not_visible(client, admin_user, host_user, event):
    rl = client.post("/api/host/listings", json={
        "title": "Inactive", "number_of_spots": 2, "price_per_spot": 10,
        "address": "addr", "latitude": 43.0642, "longitude": -89.4142,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    client.post("/api/admin/event_listings", json={
        "event_id": event["id"], "listing_id": lid, "available_spots": 2,
    }, headers=admin_user["headers"])
    client.delete(f"/api/host/listings/{lid}", headers=host_user["headers"])
    r = client.get(f"/api/events/{event['id']}/spots")
    assert all(s["listing_id"] != lid for s in r.json())


def test_spot_detail_includes_host_rating(client, approved_listing):
    lid = approved_listing["listing"]["id"]
    r = client.get(f"/api/listings/{lid}")
    assert r.status_code == 200
    assert "host_rating" in r.json()
    assert "host_total_bookings" in r.json()


def test_spot_detail_includes_distance_to_venue(client, approved_listing):
    lid = approved_listing["listing"]["id"]
    eid = approved_listing["event"]["id"]
    r = client.get(f"/api/listings/{lid}?event_id={eid}")
    assert r.status_code == 200
    assert r.json()["distance_miles"] is not None
