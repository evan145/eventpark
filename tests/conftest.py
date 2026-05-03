import importlib
import os
import tempfile
from datetime import date, time as dt_time, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@pytest.fixture
def db_setup(monkeypatch):
    from app import database as db_module
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, future=True)

    monkeypatch.setattr(db_module, "engine", test_engine)
    monkeypatch.setattr(db_module, "SessionLocal", TestSession)

    from app.database import Base
    import app.models  # noqa: F401 ensure mappers loaded
    Base.metadata.create_all(bind=test_engine)

    yield test_engine, TestSession

    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db(db_setup):
    test_engine, TestSession = db_setup
    s = TestSession()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def app(db_setup):
    from app.main import create_app
    from app.database import get_db
    test_engine, TestSession = db_setup
    application = create_app(rate_limit="10000/minute")

    def _get_db_override():
        s = TestSession()
        try:
            yield s
        finally:
            s.close()

    application.dependency_overrides[get_db] = _get_db_override
    return application


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture(autouse=True)
def mock_stripe(monkeypatch):
    from app.services import stripe_service

    calls = {"create_payment_intent": [], "refund_payment": [], "release_payout": []}

    def _cpi(amount_cents, application_fee_cents, connected_account_id=None):
        calls["create_payment_intent"].append({
            "amount_cents": amount_cents,
            "application_fee_cents": application_fee_cents,
            "connected_account_id": connected_account_id,
        })
        return {"id": f"pi_test_{len(calls['create_payment_intent'])}", "status": "succeeded",
                "amount": amount_cents, "application_fee_amount": application_fee_cents}

    def _refund(payment_intent_id, amount_cents):
        calls["refund_payment"].append({"payment_intent_id": payment_intent_id, "amount_cents": amount_cents})
        return {"id": f"re_test_{len(calls['refund_payment'])}", "status": "succeeded",
                "payment_intent": payment_intent_id, "amount": amount_cents}

    def _payout(booking):
        calls["release_payout"].append({"booking_id": booking.id})
        return {"id": f"tr_test_{len(calls['release_payout'])}", "status": "paid"}

    monkeypatch.setattr(stripe_service, "create_payment_intent", _cpi)
    monkeypatch.setattr(stripe_service, "refund_payment", _refund)
    monkeypatch.setattr(stripe_service, "release_payout", _payout)
    # Patch references inside routers (they imported the module)
    from app.routers import bookings as bookings_router
    monkeypatch.setattr(bookings_router.stripe_service, "create_payment_intent", _cpi)
    monkeypatch.setattr(bookings_router.stripe_service, "refund_payment", _refund)
    monkeypatch.setattr(bookings_router.stripe_service, "release_payout", _payout)
    return calls


@pytest.fixture(autouse=True)
def mock_email(monkeypatch):
    from app.services import email_service

    sent = []

    def make(name):
        def fn(*args, **kwargs):
            try:
                rec = {"template": name, "args": args, "kwargs": kwargs}
                sent.append(rec)
            except Exception:
                pass
            return {"sent": True, "template": name}
        return fn

    for name in (
        "send_booking_confirmation_to_guest",
        "send_new_booking_to_host",
        "send_listing_approved",
        "send_listing_rejected",
        "send_event_reminder_to_host",
        "send_event_reminder_to_guest",
    ):
        monkeypatch.setattr(email_service, name, make(name))

    from app.routers import bookings as bookings_router
    from app.routers import admin as admin_router
    monkeypatch.setattr(bookings_router.email_service, "send_booking_confirmation_to_guest",
                        email_service.send_booking_confirmation_to_guest)
    monkeypatch.setattr(bookings_router.email_service, "send_new_booking_to_host",
                        email_service.send_new_booking_to_host)
    monkeypatch.setattr(admin_router.email_service, "send_listing_approved",
                        email_service.send_listing_approved)
    monkeypatch.setattr(admin_router.email_service, "send_listing_rejected",
                        email_service.send_listing_rejected)
    return sent


@pytest.fixture(autouse=True)
def mock_geocode(monkeypatch):
    from app.services import geocoding
    monkeypatch.setattr(geocoding, "geocode_address", lambda addr: (43.0642, -89.4142))
    from app.routers import host as host_router
    monkeypatch.setattr(host_router.geocoding, "geocode_address", lambda addr: (43.0642, -89.4142))


def _register(client, email, password="password123", role="guest", **extra):
    payload = {"email": email, "password": password, "role": role}
    payload.update(extra)
    r = client.post("/api/auth/register", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    return {"user": data["user"], "token": data["token"], "headers": {"Authorization": f"Bearer {data['token']}"}}


@pytest.fixture
def guest_user(client):
    return _register(client, "guest@test.com", role="guest")


@pytest.fixture
def host_user(client, db_setup):
    info = _register(client, "host@test.com", role="host",
                     full_name="Test Host", address="123 Stadium Ave, Madison, WI")
    return info


@pytest.fixture
def admin_user(client, db_setup):
    test_engine, TestSession = db_setup
    info = _register(client, "admin@test.com", role="guest")
    from app.models import User, UserRole
    s = TestSession()
    try:
        u = s.query(User).filter(User.email == "admin@test.com").first()
        u.role = UserRole.admin
        s.commit()
    finally:
        s.close()
    from app.auth import create_token
    token = create_token(info["user"]["id"], "admin@test.com", "admin")
    return {"user": {**info["user"], "role": "admin"}, "token": token,
            "headers": {"Authorization": f"Bearer {token}"}}


@pytest.fixture
def event(client, admin_user):
    payload = {
        "name": "Wisconsin vs. Michigan",
        "venue_name": "Camp Randall Stadium",
        "venue_address": "300 Spence Steen Ave, Madison, WI 53706",
        "event_date": (date.today() + timedelta(days=7)).isoformat(),
        "event_time": "12:00:00",
        "latitude": 43.0642,
        "longitude": -89.4142,
    }
    r = client.post("/api/admin/events", json=payload, headers=admin_user["headers"])
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def host_listing(client, host_user):
    payload = {
        "title": "Driveway Near Stadium",
        "description": "Flat concrete",
        "number_of_spots": 4,
        "price_per_spot": 15.00,
        "address": "123 Stadium Ave, Madison, WI",
        "latitude": 43.0650,
        "longitude": -89.4150,
    }
    r = client.post("/api/host/listings", json=payload, headers=host_user["headers"])
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def approved_listing(client, host_listing, admin_user, event):
    r = client.patch(f"/api/admin/listings/{host_listing['id']}/status",
                     json={"status": "approved"}, headers=admin_user["headers"])
    assert r.status_code == 200, r.text
    r2 = client.post("/api/admin/event_listings",
                     json={"event_id": event["id"], "listing_id": host_listing["id"],
                           "available_spots": 4},
                     headers=admin_user["headers"])
    assert r2.status_code == 201, r2.text
    el = r2.json()
    return {"listing": host_listing, "event_listing": el, "event": event}


@pytest.fixture(autouse=True)
def _reset_config_and_main_after_each_test():
    """After every test, reload app.config and app.main so module-level
    `settings` reflects the un-monkeypatched environment again. Prevents
    importlib.reload-based tests from leaking RATE_LIMIT, ALLOWED_ORIGINS,
    DATABASE_URL, etc. into later tests."""
    yield
    import app.config
    import app.main
    importlib.reload(app.config)
    importlib.reload(app.main)
