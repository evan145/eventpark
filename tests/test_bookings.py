import re
from datetime import date, timedelta


def _book(client, el_id, spots=1, **kwargs):
    payload = {
        "event_listing_id": el_id, "guest_name": "Jane",
        "guest_email": "jane@example.com", "guest_phone": "608-555-0200",
        "spots_reserved": spots,
    }
    payload.update(kwargs)
    return client.post("/api/bookings", json=payload)


def test_guest_can_book_spots(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=2)
    assert r.status_code == 201
    data = r.json()
    assert data["confirmation_code"].startswith("EP-")
    assert data["spots_reserved"] == 2


def test_booking_calculates_total_correctly(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=2)
    assert r.json()["total_price"] == 30.0  # 2 * 15.00


def test_booking_reduces_available_spots(client, approved_listing):
    eid = approved_listing["event"]["id"]
    _book(client, approved_listing["event_listing"]["id"], spots=2)
    r = client.get(f"/api/events/{eid}")
    assert r.json()["total_available_spots"] == 2


def test_booking_fails_when_no_spots_available(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=99)
    assert r.status_code == 409


def test_booking_requires_guest_contact_info(client, approved_listing):
    r = client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "Jane", "spots_reserved": 1,
    })
    assert r.status_code == 400


def test_guest_booking_does_not_require_account(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=1)
    assert r.status_code == 201


def test_authenticated_guest_bookings_auto_fill_contact(client, guest_user, approved_listing):
    r = client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "spots_reserved": 1,
    }, headers=guest_user["headers"])
    assert r.status_code == 201
    assert r.json()["guest_email"] == "guest@test.com"


def test_booking_confirmation_number_generated(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=1)
    code = r.json()["confirmation_code"]
    assert re.match(r"^EP-\d{8}-[A-Z0-9]{4}$", code)


def _make_booking_with_event_in_days(client, admin_user, host_user, days_ahead, hours_ahead=0):
    from datetime import datetime, timedelta as td
    target = (date.today() + td(days=days_ahead)).isoformat()
    rev = client.post("/api/admin/events", json={
        "name": f"E{days_ahead}", "venue_name": f"V{days_ahead}", "venue_address": "a",
        "event_date": target, "event_time": "12:00:00",
        "latitude": 43.06, "longitude": -89.41,
    }, headers=admin_user["headers"])
    eid = rev.json()["id"]
    rl = client.post("/api/host/listings", json={
        "title": "L", "number_of_spots": 4, "price_per_spot": 10,
        "address": "addr", "latitude": 43.06, "longitude": -89.41,
    }, headers=host_user["headers"])
    lid = rl.json()["id"]
    client.patch(f"/api/admin/listings/{lid}/status", json={"status": "approved"},
                 headers=admin_user["headers"])
    rel = client.post("/api/admin/event_listings", json={
        "event_id": eid, "listing_id": lid, "available_spots": 4,
    }, headers=admin_user["headers"])
    el_id = rel.json()["id"]
    rb = _book(client, el_id, spots=2)
    return rb.json(), eid, el_id


def test_cancel_48hrs_before_returns_full_refund(client, admin_user, host_user, mock_stripe):
    booking, eid, el_id = _make_booking_with_event_in_days(client, admin_user, host_user, 5)
    r = client.post(f"/api/bookings/{booking['id']}/cancel",
                    json={"guest_email": booking["guest_email"]})
    assert r.status_code == 200
    assert r.json()["refund_percent"] == 1.0


def test_cancel_24_to_48hrs_returns_partial_refund(client, admin_user, host_user, monkeypatch):
    # Manipulate event_date to be 1 day ahead with time set ~36 hours from now
    from datetime import datetime, timezone as tz, timedelta as td
    booking, eid, el_id = _make_booking_with_event_in_days(client, admin_user, host_user, 2)
    # Force event datetime ~36 hrs from now by editing in DB
    from app.database import SessionLocal
    # Use the test's session via app state isn't accessible; just adjust through admin event update path skipped — use direct DB
    from sqlalchemy.orm import Session
    from app.models import Event
    # The test app uses an isolated engine; reach through dependency_overrides - easier path: monkeypatch datetime.now in router
    import app.routers.bookings as br
    real_dt = br.datetime
    class FakeDT(real_dt):
        @classmethod
        def now(cls, tzinfo=None):
            ev_in_36 = real_dt.now(tz.utc) + td(hours=36)
            # event_dt is from event_date+12:00; if 2 days ahead at 12:00 UTC, now must be (event - 36h)
            return ev_in_36 - td(hours=36) if False else real_dt.now(tz.utc)
    # Simpler: directly set event_time/date so it's exactly 36h in the future via admin
    # We can patch datetime.now used in cancel handler instead
    fixed_now = real_dt.combine(date.today() + td(days=2), real_dt.min.time().replace(hour=12)).replace(tzinfo=tz.utc) - td(hours=36)
    class StaticDT(real_dt):
        @classmethod
        def now(cls, tzinfo=None):
            return fixed_now if tzinfo is None else fixed_now.astimezone(tzinfo)
    monkeypatch.setattr(br, "datetime", StaticDT)
    r = client.post(f"/api/bookings/{booking['id']}/cancel",
                    json={"guest_email": booking["guest_email"]})
    assert r.status_code == 200
    assert r.json()["refund_percent"] == 0.5


def test_cancel_less_than_24hrs_no_refund(client, admin_user, host_user, monkeypatch):
    from datetime import datetime as real_dt, timezone as tz, timedelta as td
    booking, eid, el_id = _make_booking_with_event_in_days(client, admin_user, host_user, 2)
    import app.routers.bookings as br
    fixed_now = real_dt.combine(date.today() + td(days=2), real_dt.min.time().replace(hour=12)).replace(tzinfo=tz.utc) - td(hours=10)
    class StaticDT(real_dt):
        @classmethod
        def now(cls, tzinfo=None):
            return fixed_now if tzinfo is None else fixed_now.astimezone(tzinfo)
    monkeypatch.setattr(br, "datetime", StaticDT)
    r = client.post(f"/api/bookings/{booking['id']}/cancel",
                    json={"guest_email": booking["guest_email"]})
    assert r.status_code == 200
    assert r.json()["refund_percent"] == 0.0


def test_cancel_restores_available_spots(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=2)
    bid = rb.json()["id"]
    eid = approved_listing["event"]["id"]
    client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    r = client.get(f"/api/events/{eid}")
    assert r.json()["total_available_spots"] == 4


def test_cancel_completed_booking_rejected(client, admin_user, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])
    r = client.post(f"/api/bookings/{bid}/cancel",
                    json={"guest_email": rb.json()["guest_email"]})
    assert r.status_code == 400


def test_guest_can_only_cancel_own_booking(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    r = client.post(f"/api/bookings/{bid}/cancel",
                    json={"guest_email": "stranger@x.com"})
    assert r.status_code == 403


def test_guest_can_view_booking_confirmation(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    r = client.get(f"/api/bookings/{bid}")
    assert r.status_code == 200
    assert "directions_url" in r.json()


def test_confirmation_includes_host_contact(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    r = client.get(f"/api/bookings/{rb.json()['id']}")
    assert "host_name" in r.json()


def test_confirmation_includes_spot_directions(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    r = client.get(f"/api/bookings/{rb.json()['id']}")
    assert "google.com/maps" in r.json()["directions_url"]


def test_host_can_view_upcoming_bookings(client, host_user, approved_listing):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    r = client.get("/api/host/bookings/upcoming", headers=host_user["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_host_cannot_see_guest_pii_before_booking(client, host_user, approved_listing):
    # No bookings yet => host upcoming should be empty
    r = client.get("/api/host/bookings/upcoming", headers=host_user["headers"])
    assert r.status_code == 200
    assert r.json() == []
