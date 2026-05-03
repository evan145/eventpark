from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from ..database import get_db
from ..models import Event, EventListing, Listing, ListingStatus
from ..services.distance import haversine_miles

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("")
async def list_events(venue: str | None = None, db: Session = Depends(get_db)):
    """List upcoming events sorted by date asc; optional venue substring filter."""
    today = date.today()
    q = db.query(Event).filter(Event.event_date >= today)
    if venue:
        safe = venue.replace("\x00", "")
        q = q.filter(Event.venue_name.ilike(f"%{safe}%"))
    events = q.order_by(Event.event_date.asc(), Event.event_time.asc()).all()
    return [
        {"id": e.id, "name": e.name, "venue_name": e.venue_name,
         "venue_address": e.venue_address, "latitude": e.latitude,
         "longitude": e.longitude, "event_date": e.event_date.isoformat(),
         "event_time": e.event_time.isoformat()}
        for e in events
    ]


@router.get("/{event_id}")
async def get_event(event_id: int, db: Session = Depends(get_db)):
    """Event detail with total_available_spots across approved listings."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    total = (
        db.query(func.coalesce(func.sum(EventListing.available_spots), 0))
        .join(Listing, EventListing.listing_id == Listing.id)
        .filter(EventListing.event_id == event_id)
        .filter(Listing.status == ListingStatus.approved)
        .scalar()
    ) or 0
    return {
        "id": ev.id, "name": ev.name, "venue_name": ev.venue_name,
        "venue_address": ev.venue_address, "latitude": ev.latitude,
        "longitude": ev.longitude, "event_date": ev.event_date.isoformat(),
        "event_time": ev.event_time.isoformat(),
        "total_available_spots": int(total),
    }


@router.get("/{event_id}/spots")
async def event_spots(
    event_id: int,
    sort: str | None = None,
    max_price: float | None = None,
    min_spots: int | None = None,
    radius: float | None = None,
    db: Session = Depends(get_db),
):
    """Approved listings for an event with optional filters."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="event not found")
    rows = (
        db.query(EventListing, Listing)
        .join(Listing, EventListing.listing_id == Listing.id)
        .filter(EventListing.event_id == event_id)
        .filter(Listing.status == ListingStatus.approved)
        .all()
    )
    items = []
    for el, listing in rows:
        unit_price = float(el.price_override if el.price_override is not None else listing.price_per_spot)
        distance = haversine_miles(ev.latitude, ev.longitude, listing.latitude, listing.longitude)
        if max_price is not None and unit_price > max_price:
            continue
        if min_spots is not None and el.available_spots < min_spots:
            continue
        if radius is not None and distance > radius:
            continue
        items.append({
            "event_listing_id": el.id, "listing_id": listing.id,
            "title": listing.title, "address": listing.address,
            "latitude": listing.latitude, "longitude": listing.longitude,
            "available_spots": el.available_spots,
            "price_per_spot": unit_price,
            "distance_miles": round(distance, 3),
            "status": listing.status.value,
        })
    if sort == "price":
        items.sort(key=lambda x: x["price_per_spot"])
    elif sort == "distance":
        items.sort(key=lambda x: x["distance_miles"])
    return items
