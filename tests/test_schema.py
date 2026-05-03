from datetime import date, time as dt_time, timedelta, timezone
import pytest
from sqlalchemy.exc import IntegrityError
from app.models import (
    User, Host, Listing, Event, EventListing, Booking, Review,
    UserRole, ListingStatus, BookingStatus,
)


def test_users_table_has_required_columns(db):
    cols = {c.name for c in User.__table__.columns}
    for needed in ["id", "email", "password_hash", "role", "phone", "created_at", "updated_at"]:
        assert needed in cols


def test_user_role_defaults_to_guest(db):
    u = User(email="default@x.com", password_hash="x")
    db.add(u); db.commit(); db.refresh(u)
    assert u.role == UserRole.guest


def test_user_email_is_unique(db):
    db.add(User(email="dup@x.com", password_hash="x")); db.commit()
    db.add(User(email="dup@x.com", password_hash="y"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_user_requires_valid_email(db):
    with pytest.raises(ValueError):
        User(email="not-an-email", password_hash="x")


def test_hosts_table_has_required_columns(db):
    cols = {c.name for c in Host.__table__.columns}
    for needed in ["id", "user_id", "full_name", "address", "address_verified", "rating", "total_bookings", "created_at"]:
        assert needed in cols


def test_host_user_id_is_foreign_key_to_users(db):
    u = User(email="h1@x.com", password_hash="x", role=UserRole.host)
    db.add(u); db.commit()
    h = Host(user_id=u.id, full_name="A", address="B")
    db.add(h); db.commit()
    db.delete(u); db.commit()
    assert db.query(Host).filter(Host.id == h.id).first() is None


def test_host_rating_bounded_between_0_and_5(db):
    u = User(email="hr@x.com", password_hash="x", role=UserRole.host)
    db.add(u); db.commit()
    h = Host(user_id=u.id, full_name="A", address="B")
    with pytest.raises(ValueError):
        h.rating = -0.1
    with pytest.raises(ValueError):
        h.rating = 5.1
    h.rating = 4.5
    assert h.rating == 4.5


def test_host_one_per_user(db):
    u = User(email="one@x.com", password_hash="x", role=UserRole.host)
    db.add(u); db.commit()
    db.add(Host(user_id=u.id, full_name="A", address="B")); db.commit()
    db.add(Host(user_id=u.id, full_name="C", address="D"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_listings_table_has_required_columns(db):
    cols = {c.name for c in Listing.__table__.columns}
    for needed in ["id", "host_id", "title", "description", "number_of_spots",
                   "price_per_spot", "latitude", "longitude", "address", "photos",
                   "status", "created_at", "updated_at"]:
        assert needed in cols


def test_listing_status_defaults_to_pending(db):
    u = User(email="ls@x.com", password_hash="x", role=UserRole.host)
    db.add(u); db.commit()
    h = Host(user_id=u.id, full_name="A", address="B"); db.add(h); db.commit()
    l = Listing(host_id=h.id, title="T", number_of_spots=1, price_per_spot=10.0,
                latitude=43.0, longitude=-89.0, address="addr")
    db.add(l); db.commit(); db.refresh(l)
    assert l.status == ListingStatus.pending


def test_listing_number_of_spots_positive():
    with pytest.raises(ValueError):
        Listing(host_id=1, title="T", number_of_spots=0, price_per_spot=10.0,
                latitude=43.0, longitude=-89.0, address="addr")


def test_listing_price_positive():
    with pytest.raises(ValueError):
        Listing(host_id=1, title="T", number_of_spots=1, price_per_spot=-1.0,
                latitude=43.0, longitude=-89.0, address="addr")


def test_listing_requires_geocoordinates(db):
    u = User(email="lg@x.com", password_hash="x", role=UserRole.host)
    db.add(u); db.commit()
    h = Host(user_id=u.id, full_name="A", address="B"); db.add(h); db.commit()
    l = Listing(host_id=h.id, title="T", number_of_spots=1, price_per_spot=10.0,
                latitude=None, longitude=None, address="addr")
    db.add(l)
    with pytest.raises(IntegrityError):
        db.commit()


def test_events_table_has_required_columns(db):
    cols = {c.name for c in Event.__table__.columns}
    for needed in ["id", "name", "venue_name", "venue_address", "latitude",
                   "longitude", "event_date", "event_time", "capacity", "description", "created_at"]:
        assert needed in cols


def test_event_date_unique_per_venue(db):
    e1 = Event(name="A", venue_name="V", venue_address="addr", latitude=1, longitude=1,
               event_date=date(2030, 1, 1), event_time=dt_time(12, 0))
    e2 = Event(name="B", venue_name="V", venue_address="addr", latitude=1, longitude=1,
               event_date=date(2030, 1, 1), event_time=dt_time(15, 0))
    db.add(e1); db.commit()
    db.add(e2)
    with pytest.raises(IntegrityError):
        db.commit()


def test_event_listings_table_has_required_columns(db):
    cols = {c.name for c in EventListing.__table__.columns}
    for needed in ["id", "event_id", "listing_id", "available_spots", "price_override", "created_at"]:
        assert needed in cols


def _make_event_listing(db):
    u = User(email="el@x.com", password_hash="x", role=UserRole.host); db.add(u); db.commit()
    h = Host(user_id=u.id, full_name="A", address="B"); db.add(h); db.commit()
    l = Listing(host_id=h.id, title="T", number_of_spots=4, price_per_spot=10.0,
                latitude=43.0, longitude=-89.0, address="addr")
    db.add(l); db.commit()
    e = Event(name="A", venue_name="V", venue_address="addr", latitude=1, longitude=1,
              event_date=date(2030, 6, 1), event_time=dt_time(12, 0))
    db.add(e); db.commit()
    return l, e


def test_event_listing_prevents_duplicate(db):
    l, e = _make_event_listing(db)
    db.add(EventListing(event_id=e.id, listing_id=l.id, listing=l, available_spots=2)); db.commit()
    db.add(EventListing(event_id=e.id, listing_id=l.id, listing=l, available_spots=2))
    with pytest.raises(IntegrityError):
        db.commit()


def test_available_spots_does_not_exceed_listing_capacity(db):
    l, e = _make_event_listing(db)
    with pytest.raises(ValueError):
        EventListing(event_id=e.id, listing_id=l.id, listing=l, available_spots=99)


def test_bookings_table_has_required_columns(db):
    cols = {c.name for c in Booking.__table__.columns}
    for needed in ["id", "event_listing_id", "guest_id", "guest_name", "guest_email",
                   "guest_phone", "spots_reserved", "total_price", "status",
                   "stripe_payment_intent_id", "host_payout_amount", "created_at"]:
        assert needed in cols


def test_booking_spots_reserved_positive():
    with pytest.raises(ValueError):
        Booking(event_listing_id=1, guest_name="G", guest_email="g@x.com",
                guest_phone="0", spots_reserved=0, total_price=10.0,
                confirmation_code="EP-TEST")


def test_booking_total_price_matches_calculation():
    spots = 3
    unit = 12.50
    total = spots * unit
    b = Booking(event_listing_id=1, guest_name="G", guest_email="g@x.com",
                guest_phone="0", spots_reserved=spots, total_price=total,
                confirmation_code="EP-TEST-2")
    assert b.total_price == 37.50


def test_booking_host_payout_is_80_percent(db):
    l, e = _make_event_listing(db)
    el = EventListing(event_id=e.id, listing_id=l.id, listing=l, available_spots=2)
    db.add(el); db.commit()
    b = Booking(event_listing_id=el.id, guest_name="G", guest_email="g@x.com",
                guest_phone="0", spots_reserved=2, total_price=100.0,
                confirmation_code="EP-PAY-1")
    db.add(b); db.commit(); db.refresh(b)
    assert abs(b.host_payout_amount - 80.0) < 0.001


def test_reviews_table_has_required_columns(db):
    cols = {c.name for c in Review.__table__.columns}
    for needed in ["id", "booking_id", "rating", "comment", "created_at"]:
        assert needed in cols


def test_review_unique_per_booking(db):
    l, e = _make_event_listing(db)
    el = EventListing(event_id=e.id, listing_id=l.id, listing=l, available_spots=2)
    db.add(el); db.commit()
    b = Booking(event_listing_id=el.id, guest_name="G", guest_email="g@x.com",
                guest_phone="0", spots_reserved=1, total_price=10.0,
                confirmation_code="EP-REV-1")
    db.add(b); db.commit()
    db.add(Review(booking_id=b.id, rating=5)); db.commit()
    db.add(Review(booking_id=b.id, rating=4))
    with pytest.raises(IntegrityError):
        db.commit()


def test_review_rating_in_valid_range():
    with pytest.raises(ValueError):
        Review(booking_id=1, rating=0)
    with pytest.raises(ValueError):
        Review(booking_id=1, rating=6)
    r = Review(booking_id=1, rating=3)
    assert r.rating == 3
