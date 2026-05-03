def _book(client, el_id, spots=1):
    return client.post("/api/bookings", json={
        "event_listing_id": el_id, "guest_name": "G", "guest_email": "g@x.com",
        "guest_phone": "0", "spots_reserved": spots,
    })


def test_payment_intent_created_on_booking(client, approved_listing, mock_stripe):
    _book(client, approved_listing["event_listing"]["id"], spots=2)
    assert len(mock_stripe["create_payment_intent"]) == 1


def test_platform_retains_20_percent_commission(client, approved_listing, mock_stripe):
    _book(client, approved_listing["event_listing"]["id"], spots=2)
    call = mock_stripe["create_payment_intent"][0]
    assert call["application_fee_cents"] == int(round(call["amount_cents"] * 0.20))


def test_host_receives_80_percent_payout(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=2)
    assert abs(r.json()["host_payout_amount"] - r.json()["total_price"] * 0.80) < 0.01


def test_stripe_fees_deducted_from_commission(client, admin_user, approved_listing):
    _book(client, approved_listing["event_listing"]["id"], spots=2)
    r = client.get("/api/admin/analytics/revenue", headers=admin_user["headers"])
    data = r.json()
    assert data["net_commission"] == round(data["total_commission"] - data["stripe_fees"], 2)


def test_failed_payment_rejects_booking(client, approved_listing, monkeypatch):
    from app.routers import bookings as br
    def fail(*a, **kw):
        return {"status": "failed"}
    monkeypatch.setattr(br.stripe_service, "create_payment_intent", fail)
    r = _book(client, approved_listing["event_listing"]["id"], spots=1)
    assert r.status_code == 402


def test_payment_intent_stores_on_booking_record(client, approved_listing):
    r = _book(client, approved_listing["event_listing"]["id"], spots=1)
    assert r.json()["stripe_payment_intent_id"]


def test_full_refund_issues_charge_reverse(client, approved_listing, mock_stripe):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    r = client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    assert r.status_code == 200
    assert len(mock_stripe["refund_payment"]) == 1
    assert mock_stripe["refund_payment"][0]["amount_cents"] == int(round(rb.json()["total_price"] * 100))


def test_partial_refund_issues_proportional_charge_reverse(client, admin_user, host_user, monkeypatch):
    from datetime import datetime as real_dt, date, timedelta, timezone
    rev = client.post("/api/admin/events", json={
        "name": "P", "venue_name": "VP", "venue_address": "a",
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
    rb = _book(client, rel.json()["id"], spots=1)
    bid = rb.json()["id"]

    import app.routers.bookings as br
    fixed = real_dt.combine(date.today() + timedelta(days=2), real_dt.min.time().replace(hour=12)).replace(tzinfo=timezone.utc) - timedelta(hours=36)
    class StaticDT(real_dt):
        @classmethod
        def now(cls, tzinfo=None):
            return fixed if tzinfo is None else fixed.astimezone(tzinfo)
    monkeypatch.setattr(br, "datetime", StaticDT)

    calls = []
    def refund(pi, amt):
        calls.append({"amount_cents": amt, "payment_intent_id": pi})
        return {"id": "re", "status": "succeeded", "amount": amt, "payment_intent": pi}
    monkeypatch.setattr(br.stripe_service, "refund_payment", refund)

    r = client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    assert r.status_code == 200
    assert calls[0]["amount_cents"] == int(round(rb.json()["total_price"] * 0.5 * 100))


def test_refund_updates_booking_status(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    r = client.get(f"/api/bookings/{bid}")
    assert r.json()["status"] == "cancelled"


def test_no_double_refund(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=1)
    bid = rb.json()["id"]
    client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    r = client.post(f"/api/bookings/{bid}/cancel", json={"guest_email": rb.json()["guest_email"]})
    assert r.status_code == 400


def test_host_payout_held_until_post_event(client, approved_listing, host_user):
    _book(client, approved_listing["event_listing"]["id"], spots=1)
    r = client.get("/api/host/earnings", headers=host_user["headers"])
    # Confirmed (not completed) bookings show as pending
    assert r.json()["pending"] > 0
    assert r.json()["total_earned"] == 0


def test_payout_amount_records_on_booking(client, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=2)
    assert rb.json()["host_payout_amount"] > 0


def test_host_can_view_earnings_summary(client, host_user, admin_user, approved_listing):
    rb = _book(client, approved_listing["event_listing"]["id"], spots=2)
    bid = rb.json()["id"]
    client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])
    r = client.get("/api/host/earnings", headers=host_user["headers"])
    assert r.json()["total_earned"] > 0
