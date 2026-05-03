from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import date, datetime, timezone, time as dt_time
from ..database import get_db
from ..models import (
    User, Listing, ListingStatus, Event, EventListing, Booking, BookingStatus,
)
from ..deps import require_role
from ..services import email_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.patch("/listings/{listing_id}/status")
async def update_listing_status(listing_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Approve or reject a listing."""
    data = await request.json()
    status_str = (data.get("status") or "").lower()
    reason = data.get("reason")
    if status_str not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")
    listing.status = ListingStatus(status_str)
    db.commit()
    db.refresh(listing)
    if status_str == "approved":
        email_service.send_listing_approved(listing)
    else:
        email_service.send_listing_rejected(listing, reason)
    return {"id": listing.id, "status": listing.status.value}


@router.get("/listings")
async def list_listings(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """List all listings, optionally filtered by status."""
    q = db.query(Listing)
    if status:
        try:
            q = q.filter(Listing.status == ListingStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="invalid status")
    return [
        {"id": l.id, "host_id": l.host_id, "title": l.title, "status": l.status.value,
         "number_of_spots": l.number_of_spots, "price_per_spot": l.price_per_spot,
         "address": l.address}
        for l in q.all()
    ]


@router.get("/bookings")
async def list_bookings(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """List all bookings."""
    bookings = db.query(Booking).all()
    return [
        {"id": b.id, "guest_name": b.guest_name, "guest_email": b.guest_email,
         "spots_reserved": b.spots_reserved, "total_price": b.total_price,
         "status": b.status.value, "confirmation_code": b.confirmation_code}
        for b in bookings
    ]


@router.get("/analytics/revenue")
async def revenue(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Platform revenue analytics."""
    bookings = db.query(Booking).filter(Booking.status.in_([BookingStatus.confirmed, BookingStatus.completed])).all()
    total_gross = sum(float(b.total_price) for b in bookings)
    total_commission = round(total_gross * 0.20, 2)
    stripe_fees = sum((float(b.total_price) * 0.029 + 0.30) for b in bookings)
    net_commission = round(total_commission - stripe_fees, 2)
    return {
        "total_bookings": len(bookings),
        "total_gross": round(total_gross, 2),
        "total_commission": total_commission,
        "stripe_fees": round(stripe_fees, 2),
        "net_commission": net_commission,
    }


@router.post("/disputes", status_code=201)
async def handle_dispute(request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Record a dispute resolution against a booking."""
    data = await request.json()
    booking_id = data.get("booking_id")
    resolution = data.get("resolution")
    if not booking_id or not resolution:
        raise HTTPException(status_code=400, detail="booking_id and resolution required")
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="booking not found")
    booking.dispute_resolution = resolution
    db.commit()
    return {"booking_id": booking.id, "resolution": resolution}


@router.post("/events", status_code=201)
async def create_event(request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Create a new event."""
    data = await request.json()
    required = ("name", "venue_name", "venue_address", "event_date", "event_time")
    for f in required:
        if not data.get(f):
            raise HTTPException(status_code=400, detail=f"{f} required")
    try:
        event_date = date.fromisoformat(data["event_date"])
        event_time = dt_time.fromisoformat(data["event_time"])
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid date/time")
    if event_date < date.today():
        raise HTTPException(status_code=400, detail="event_date must not be in the past")
    latitude = data.get("latitude", 43.0642)
    longitude = data.get("longitude", -89.4142)
    ev = Event(
        name=data["name"], venue_name=data["venue_name"], venue_address=data["venue_address"],
        latitude=float(latitude), longitude=float(longitude),
        event_date=event_date, event_time=event_time,
        capacity=data.get("capacity"), description=data.get("description"),
    )
    db.add(ev)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="duplicate event")
    db.refresh(ev)
    return {"id": ev.id, "name": ev.name, "venue_name": ev.venue_name,
            "event_date": ev.event_date.isoformat(), "event_time": ev.event_time.isoformat()}


@router.delete("/events/{event_id}")
async def delete_event(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Delete an event (cascades to event_listings)."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    db.delete(ev)
    db.commit()
    return {"id": event_id, "deleted": True}


@router.get("/events/{event_id}/bookings")
async def event_bookings(event_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """All bookings for an event."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    bookings = (
        db.query(Booking)
        .join(EventListing, Booking.event_listing_id == EventListing.id)
        .filter(EventListing.event_id == event_id)
        .all()
    )
    return [
        {"id": b.id, "guest_name": b.guest_name, "spots_reserved": b.spots_reserved,
         "total_price": b.total_price, "status": b.status.value}
        for b in bookings
    ]


@router.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: int, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Mark a booking completed (for testing/post-event)."""
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="booking not found")
    b.status = BookingStatus.completed
    db.commit()
    return {"id": b.id, "status": b.status.value}


@router.post("/event_listings", status_code=201)
async def create_event_listing(request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    """Link a listing to an event."""
    data = await request.json()
    event_id = data.get("event_id")
    listing_id = data.get("listing_id")
    available_spots = data.get("available_spots")
    price_override = data.get("price_override")
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not listing or not ev:
        raise HTTPException(status_code=404, detail="event or listing not found")
    if available_spots is None:
        available_spots = listing.number_of_spots
    el = EventListing(event_id=event_id, listing_id=listing_id, listing=listing,
                      available_spots=available_spots, price_override=price_override)
    db.add(el)
    db.commit()
    db.refresh(el)
    return {"id": el.id, "event_id": el.event_id, "listing_id": el.listing_id,
            "available_spots": el.available_spots, "price_override": el.price_override}
