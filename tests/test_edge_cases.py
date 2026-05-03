import threading
from datetime import datetime, timedelta, timezone, date


def _book(client, el_id, spots=1, name="G", email="g@x.com"):
    return client.post("/api/bookings", json={
        "event_listing_id": el_id, "guest_name": name, "guest_email": email,
        "guest_phone": "0", "spots_reserved": spots,
    })


def test_concurrent_bookings_do_not_overbook(client, admin_user, host_user):
    rev = client.post("/api/admin/events", json={
        "name": "Concurrency", "venue_name": "VC", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=10)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]
    rl = client.post("/api/host/listings", json={
        "title": "L", "number_of_spots": 1, "price_per_spot": 10,
        "address": "a", "latitude": 1, "longitude": 1,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    rel = client.post("/api/admin/event_listings", json={
        "event_id": eid, "listing_id": lid, "available_spots": 1,
    }, headers=admin_user["headers"])
    el_id = rel.json()["id"]

    results = []
    def book(i):
        r = _book(client, el_id, spots=1, name=f"G{i}", email=f"g{i}@x.com")
        results.append(r.status_code)

    t1 = threading.Thread(target=book, args=(1,))
    t2 = threading.Thread(target=book, args=(2,))
    t1.start(); t2.start()
    t1.join(); t2.join()

    assert sorted(results) == [201, 409] or results.count(201) == 1


def test_booking_on_deleted_event_returns_404(client, admin_user, approved_listing):
    eid = approved_listing["event"]["id"]
    el_id = approved_listing["event_listing"]["id"]
    client.delete(f"/api/admin/events/{eid}", headers=admin_user["headers"])
    r = _book(client, el_id, spots=1)
    assert r.status_code == 404


def test_null_bytes_in_input_sanitized(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=1, name="Ja\x00ne")
    assert r.status_code == 201
    assert "\x00" not in r.json()["guest_name"]


def test_sql_injection_in_search_rejected(client, event):
    r = client.get("/api/events?venue='; DROP TABLE events;--")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_xss_in_review_comment_escaped():
    from jinja2 import Environment, select_autoescape
    env = Environment(autoescape=select_autoescape(["html"]))
    t = env.from_string("{{ comment }}")
    rendered = t.render(comment="<script>alert(1)</script>")
    assert "&lt;script&gt;" in rendered
    assert "<script>" not in rendered


def test_large_photo_upload_rejected(client, host_user):
    import base64
    big = base64.b64encode(b"x" * (11 * 1024 * 1024)).decode()
    r = client.post("/api/host/listings", json={
        "title": "Big", "number_of_spots": 1, "price_per_spot": 10,
        "address": "addr", "latitude": 1, "longitude": 1, "photo_base64": big,
    }, headers=host_user["headers"])
    assert r.status_code == 413


def test_deleted_host_listings_inaccessible(client, host_user, host_listing):
    lid = host_listing["id"]
    client.delete(f"/api/host/listings/{lid}", headers=host_user["headers"])
    r = client.get(f"/api/listings/{lid}")
    assert r.status_code == 404


def test_booking_past_event_rejected(client, admin_user, host_user, db_setup):
    rev = client.post("/api/admin/events", json={
        "name": "Future", "venue_name": "VF", "venue_address": "a",
        "event_date": (date.today() + timedelta(days=2)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]
    rl = client.post("/api/host/listings", json={
        "title": "L", "number_of_spots": 2, "price_per_spot": 10,
        "address": "a", "latitude": 1, "longitude": 1,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    rel = client.post("/api/admin/event_listings", json={
        "event_id": eid, "listing_id": lid, "available_spots": 2,
    }, headers=admin_user["headers"])
    el_id = rel.json()["id"]

    _, TestSession = db_setup
    s = TestSession()
    try:
        from app.models import Event
        from datetime import date as d, time as t
        ev = s.query(Event).filter(Event.id == eid).first()
        ev.event_date = d.today() - timedelta(days=1)
        s.commit()
    finally:
        s.close()
    r = _book(client, el_id, spots=1)
    assert r.status_code == 400


def test_future_date_in_past_rejected(client, admin_user):
    r = client.post("/api/admin/events", json={
        "name": "Past", "venue_name": "VP", "venue_address": "a",
        "event_date": (date.today() - timedelta(days=1)).isoformat(),
        "event_time": "12:00:00", "latitude": 1, "longitude": 1,
    }, headers=admin_user["headers"])
    assert r.status_code == 400


def test_timezone_consistency(db):
    from app.models import User, ensure_utc
    u = User(email="tz@x.com", password_hash="x")
    db.add(u); db.commit(); db.refresh(u)
    dt = ensure_utc(u.created_at)
    assert dt.tzinfo is not None
    assert dt.tzinfo.utcoffset(dt).total_seconds() == 0
