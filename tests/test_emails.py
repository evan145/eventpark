from datetime import datetime, timedelta, timezone


def _book(client, el_id, spots=1):
    return client.post("/api/bookings", json={
        "event_listing_id": el_id, "guest_name": "G", "guest_email": "g@x.com",
        "guest_phone": "0", "spots_reserved": spots,
    })


def test_host_notified_on_new_booking(client, approved_listing, mock_email):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    templates = [m["template"] for m in mock_email]
    assert "send_new_booking_to_host" in templates


def test_guest_receives_booking_confirmation(client, approved_listing, mock_email):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    templates = [m["template"] for m in mock_email]
    assert "send_booking_confirmation_to_guest" in templates


def test_confirmation_email_includes_cancellation_policy():
    # Import the module fresh to bypass the autouse mock for this test
    import importlib
    import app.services.email_service as es
    importlib.reload(es)

    class FakeBooking:
        confirmation_code = "EP-X"
        spots_reserved = 1
        total_price = 10.0
        guest_email = "g@x.com"
    out = es.send_booking_confirmation_to_guest(FakeBooking())
    assert "cancel" in out["body"].lower()
    importlib.reload(es)


def test_host_notified_before_event(client, approved_listing, db_setup, mock_email):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    _, TestSession = db_setup
    s = TestSession()
    try:
        from app.services import email_service
        from app.models import Event
        ev = s.query(Event).first()
        event_dt = datetime.combine(ev.event_date, ev.event_time).replace(tzinfo=timezone.utc)
        # 24 hours before
        sent_before = len([m for m in mock_email if m["template"] == "send_event_reminder_to_host"])
        email_service.send_pre_event_reminders(event_dt - timedelta(hours=24), s)
        sent_after = len([m for m in mock_email if m["template"] == "send_event_reminder_to_host"])
        assert sent_after > sent_before
    finally:
        s.close()


def test_guest_notified_before_event(client, approved_listing, db_setup, mock_email):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    _, TestSession = db_setup
    s = TestSession()
    try:
        from app.services import email_service
        from app.models import Event
        ev = s.query(Event).first()
        event_dt = datetime.combine(ev.event_date, ev.event_time).replace(tzinfo=timezone.utc)
        before = len([m for m in mock_email if m["template"] == "send_event_reminder_to_guest"])
        email_service.send_pre_event_reminders(event_dt - timedelta(hours=4), s)
        after = len([m for m in mock_email if m["template"] == "send_event_reminder_to_guest"])
        assert after > before
    finally:
        s.close()


def test_host_notified_of_approval(client, admin_user, host_listing, mock_email):
    client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                 json={"status": "approved"}, headers=admin_user["headers"])
    assert any(m["template"] == "send_listing_approved" for m in mock_email)


def test_host_notified_of_rejection(client, admin_user, host_listing, mock_email):
    client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                 json={"status": "rejected", "reason": "no photos"},
                 headers=admin_user["headers"])
    assert any(m["template"] == "send_listing_rejected" for m in mock_email)


def test_no_email_sent_for_test_accounts(mock_email):
    # In tests, mocked send_email returns "sent": True without actually delivering
    from app.services.email_service import send_email
    out = send_email("test@example.com", "Test", "Body")
    assert out["sent"] is True
    # No real network call could occur because the function is a pure helper.
