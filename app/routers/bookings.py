import threading
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    Booking, BookingStatus, EventListing, Event, Listing, Host, User, Review,
)
from ..deps import get_current_user, get_optional_user
from ..services import stripe_service, email_service
from ..services.confirmation import generate_confirmation_code

router = APIRouter(prefix="/api", tags=["bookings"])

_booking_locks: dict[int, threading.Lock] = defaultdict(threading.Lock)
_locks_master = threading.Lock()


def _lock_for(event_listing_id: int) -> threading.Lock:
    with _locks_master:
        return _booking_locks[event_listing_id]


def _strip_nulls(value):
    if isinstance(value, str):
        return value.replace("\x00", "")
    return value


@router.post("/bookings", status_code=201)
async def create_booking(request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    """Create a booking for an event listing."""
    data = await request.json()
    event_listing_id = data.get("event_listing_id")
    spots_reserved = data.get("spots_reserved")
    guest_name = _strip_nulls(data.get("guest_name"))
    guest_email = _strip_nulls(data.get("guest_email"))
    guest_phone = _strip_nulls(data.get("guest_phone"))

    if user is not None:
        if not guest_name:
            guest_name = user.email.split("@")[0]
        if not guest_email:
            guest_email = user.email
        if not guest_phone:
            guest_phone = user.phone or "000-000-0000"

    if not event_listing_id:
        raise HTTPException(status_code=400, detail="event_listing_id required")
    if not spots_reserved or int(spots_reserved) < 1:
        raise HTTPException(status_code=400, detail="spots_reserved must be >= 1")
    if not guest_name or not guest_email or not guest_phone:
        raise HTTPException(status_code=400, detail="guest contact info required")

    el = db.query(EventListing).filter(EventListing.id == event_listing_id).first()
    if not el:
        raise HTTPException(status_code=404, detail="event listing not found")
    ev = el.event
    listing = el.listing
    if ev is None:
        raise HTTPException(status_code=404, detail="event not found")
    event_dt = datetime.combine(ev.event_date, ev.event_time).replace(tzinfo=timezone.utc)
    if event_dt < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="cannot book past event")

    spots_reserved = int(spots_reserved)
    unit_price = float(el.price_override if el.price_override is not None else listing.price_per_spot)
    total_price = round(spots_reserved * unit_price, 2)

    lock = _lock_for(event_listing_id)
    with lock:
        db.refresh(el)
        if spots_reserved > el.available_spots:
            raise HTTPException(status_code=409, detail="not enough spots available")

        try:
            intent = stripe_service.create_payment_intent(
                int(round(total_price * 100)),
                int(round(total_price * 100 * 0.20)),
                None,
            )
        except Exception:
            raise HTTPException(status_code=402, detail="payment failed")
        if not intent or intent.get("status") != "succeeded":
            raise HTTPException(status_code=402, detail="payment failed")

        code = generate_confirmation_code()
        while db.query(Booking).filter(Booking.confirmation_code == code).first() is not None:
            code = generate_confirmation_code()

        booking = Booking(
            event_listing_id=el.id,
            guest_id=user.id if user else None,
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
            spots_reserved=spots_reserved,
            total_price=total_price,
            status=BookingStatus.confirmed,
            stripe_payment_intent_id=intent.get("id"),
            host_payout_amount=round(total_price * 0.80, 2),
            confirmation_code=code,
        )
        el.available_spots = el.available_spots - spots_reserved
        db.add(booking)
        db.commit()
        db.refresh(booking)

    try:
        email_service.send_booking_confirmation_to_guest(booking)
        email_service.send_new_booking_to_host(booking)
    except Exception:
        pass

    return _serialize_booking(booking, include_host=True)


def _serialize_booking(b: Booking, include_host: bool = False):
    out = {
        "id": b.id, "event_listing_id": b.event_listing_id,
        "guest_name": b.guest_name, "guest_email": b.guest_email, "guest_phone": b.guest_phone,
        "spots_reserved": b.spots_reserved, "total_price": b.total_price,
        "status": b.status.value,
        "stripe_payment_intent_id": b.stripe_payment_intent_id,
        "host_payout_amount": b.host_payout_amount,
        "confirmation_code": b.confirmation_code,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }
    if include_host and b.event_listing and b.event_listing.listing:
        listing = b.event_listing.listing
        host = listing.host
        out["spot_address"] = listing.address
        out["directions_url"] = f"https://www.google.com/maps/dir/?api=1&destination={listing.latitude},{listing.longitude}"
        out["host_name"] = host.full_name if host else None
        out["host_phone"] = host.user.phone if host and host.user else None
    return out


@router.get("/bookings/{booking_id}")
async def get_booking(booking_id: int, db: Session = Depends(get_db)):
    """Booking detail with directions and host contact."""
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="booking not found")
    return _serialize_booking(b, include_host=True)


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: int, request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    """Cancel a booking applying the refund policy."""
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="booking not found")
    if b.status == BookingStatus.completed:
        raise HTTPException(status_code=400, detail="cannot cancel completed booking")
    if b.status == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="already cancelled")

    try:
        body = await request.json()
    except Exception:
        body = {}
    requester_email = (body or {}).get("guest_email")
    authorized = False
    if user is not None:
        if user.role.value == "admin":
            authorized = True
        elif b.guest_id == user.id:
            authorized = True
        elif b.guest_email and b.guest_email.lower() == user.email.lower():
            authorized = True
    if not authorized and requester_email:
        if requester_email.lower() == b.guest_email.lower():
            authorized = True
    if not authorized:
        raise HTTPException(status_code=403, detail="not your booking")

    ev = b.event_listing.event
    event_dt = datetime.combine(ev.event_date, ev.event_time).replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    delta = event_dt - now
    hours = delta.total_seconds() / 3600.0

    if hours > 48:
        refund_pct = 1.0
    elif hours >= 24:
        refund_pct = 0.5
    else:
        refund_pct = 0.0

    refund_amount = round(float(b.total_price) * refund_pct, 2)
    refund_resp = None
    if refund_amount > 0 and b.stripe_payment_intent_id:
        refund_resp = stripe_service.refund_payment(b.stripe_payment_intent_id, int(round(refund_amount * 100)))

    b.event_listing.available_spots = b.event_listing.available_spots + b.spots_reserved
    b.status = BookingStatus.cancelled
    b.refund_amount = refund_amount
    db.commit()
    db.refresh(b)
    return {
        "id": b.id, "status": b.status.value, "refund_amount": refund_amount,
        "refund_percent": refund_pct, "refund": refund_resp,
    }


@router.post("/reviews", status_code=201)
async def create_review(request: Request, db: Session = Depends(get_db), user: User | None = Depends(get_optional_user)):
    """Create a review for a completed booking."""
    data = await request.json()
    booking_id = data.get("booking_id")
    rating = data.get("rating")
    comment = data.get("comment")
    if not booking_id or rating is None:
        raise HTTPException(status_code=400, detail="booking_id and rating required")
    if comment is not None and len(comment) > 500:
        raise HTTPException(status_code=400, detail="comment must be <= 500 characters")
    try:
        rating_int = int(rating)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="rating must be integer")
    if rating_int < 1 or rating_int > 5:
        raise HTTPException(status_code=400, detail="rating must be 1-5")

    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="booking not found")
    if b.status != BookingStatus.completed:
        raise HTTPException(status_code=400, detail="booking is not completed")

    if user is not None:
        if b.guest_id is not None and b.guest_id != user.id and user.role.value != "admin":
            raise HTTPException(status_code=403, detail="not your booking")
        if b.guest_id is None and b.guest_email.lower() != user.email.lower() and user.role.value != "admin":
            raise HTTPException(status_code=403, detail="not your booking")

    existing = db.query(Review).filter(Review.booking_id == booking_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="review already exists")

    try:
        review = Review(booking_id=booking_id, rating=rating_int, comment=comment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.add(review)

    host = b.event_listing.listing.host
    host.total_bookings = (host.total_bookings or 0) + 1
    other = (
        db.query(Review)
        .join(Booking, Review.booking_id == Booking.id)
        .join(EventListing, Booking.event_listing_id == EventListing.id)
        .join(Listing, EventListing.listing_id == Listing.id)
        .filter(Listing.host_id == host.id)
        .all()
    )
    ratings = [r.rating for r in other] + [rating_int]
    host.rating = round(sum(ratings) / len(ratings), 2)
    db.commit()
    db.refresh(review)
    return {
        "id": review.id, "booking_id": review.booking_id,
        "rating": review.rating, "comment": review.comment,
        "host_rating": host.rating, "host_total_bookings": host.total_bookings,
    }
