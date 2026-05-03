"""Seed the dev database with test users, events, and an approved listing.

Usage:
    python seed.py            # seed (skips items that already exist)
    python seed.py --reset    # wipe DB and reseed from scratch
"""
import sys
from datetime import date, time, timedelta

from app.database import Base, SessionLocal, engine
from app.auth import hash_password
from app.models import (
    User, UserRole, Host, Listing, ListingStatus,
    Event, EventListing,
)


ADMIN = {"email": "admin@eventpark.test", "password": "password123"}
HOST = {"email": "host@eventpark.test", "password": "password123",
        "full_name": "Sample Host", "address": "123 Stadium Ave, Madison, WI 53706",
        "phone": "608-555-0100"}
GUEST = {"email": "guest@eventpark.test", "password": "password123",
         "phone": "608-555-0200"}


def reset():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def get_or_create_user(db, email, password, role, phone=None):
    u = db.query(User).filter_by(email=email).first()
    if u:
        return u
    u = User(email=email, password_hash=hash_password(password),
            role=UserRole(role), phone=phone)
    db.add(u); db.flush()
    return u


def main(do_reset=False):
    if do_reset:
        reset()
    else:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = get_or_create_user(db, ADMIN["email"], ADMIN["password"], "admin")
        host_user = get_or_create_user(db, HOST["email"], HOST["password"], "host",
                                       phone=HOST["phone"])
        guest_user = get_or_create_user(db, GUEST["email"], GUEST["password"], "guest",
                                        phone=GUEST["phone"])

        host = db.query(Host).filter_by(user_id=host_user.id).first()
        if not host:
            host = Host(user_id=host_user.id, full_name=HOST["full_name"],
                        address=HOST["address"], address_verified=True)
            db.add(host); db.flush()

        # Two events: one in 7 days, one in 30 days
        events = [
            {"name": "Wisconsin vs Iowa", "venue_name": "Camp Randall Stadium",
             "venue_address": "1440 Monroe St, Madison, WI 53711",
             "latitude": 43.0700, "longitude": -89.4128,
             "event_date": date.today() + timedelta(days=7), "event_time": time(12, 0),
             "description": "Big Ten football."},
            {"name": "Wisconsin vs Michigan", "venue_name": "Camp Randall Stadium",
             "venue_address": "1440 Monroe St, Madison, WI 53711",
             "latitude": 43.0700, "longitude": -89.4128,
             "event_date": date.today() + timedelta(days=30), "event_time": time(15, 30),
             "description": "Rivalry game."},
        ]
        ev_objs = []
        for ev in events:
            existing = db.query(Event).filter_by(
                venue_name=ev["venue_name"], event_date=ev["event_date"]).first()
            if existing:
                ev_objs.append(existing); continue
            obj = Event(**ev)
            db.add(obj); db.flush()
            ev_objs.append(obj)

        # One approved listing for the host
        listing = db.query(Listing).filter_by(host_id=host.id).first()
        if not listing:
            listing = Listing(
                host_id=host.id,
                title="Driveway 2 blocks from Camp Randall",
                description="Flat concrete pad, easy in/out, friendly host.",
                number_of_spots=4, price_per_spot=20.0,
                latitude=43.0710, longitude=-89.4140,
                address="456 Regent St, Madison, WI 53715",
                status=ListingStatus.approved,
            )
            db.add(listing); db.flush()

        # Link listing to both events
        for ev in ev_objs:
            link = db.query(EventListing).filter_by(
                event_id=ev.id, listing_id=listing.id).first()
            if link:
                continue
            db.add(EventListing(event_id=ev.id, listing_id=listing.id,
                                available_spots=listing.number_of_spots,
                                price_override=None))

        db.commit()

        print("Seed complete.")
        print(f"  Admin: {ADMIN['email']}  /  {ADMIN['password']}")
        print(f"  Host:  {HOST['email']}  /  {HOST['password']}")
        print(f"  Guest: {GUEST['email']}  /  {GUEST['password']}")
        print(f"  Events: {len(ev_objs)} created/found")
        print(f"  Listing id={listing.id} (approved) linked to all events")
    finally:
        db.close()


if __name__ == "__main__":
    main(do_reset="--reset" in sys.argv)
