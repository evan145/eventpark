from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Listing, ListingStatus, EventListing, Event
from ..services.distance import haversine_miles

router = APIRouter(prefix="/api/listings", tags=["listings"])


@router.get("/{listing_id}")
async def get_listing(listing_id: int, event_id: int | None = None, db: Session = Depends(get_db)):
    """Public listing detail; returns 404 for inactive listings."""
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing or listing.status == ListingStatus.inactive:
        raise HTTPException(status_code=404, detail="listing not found")
    host = listing.host
    distance = None
    if event_id is not None:
        ev = db.query(Event).filter(Event.id == event_id).first()
        if ev:
            distance = round(haversine_miles(ev.latitude, ev.longitude, listing.latitude, listing.longitude), 3)
    return {
        "id": listing.id, "title": listing.title, "description": listing.description,
        "address": listing.address, "latitude": listing.latitude, "longitude": listing.longitude,
        "number_of_spots": listing.number_of_spots, "price_per_spot": listing.price_per_spot,
        "status": listing.status.value, "photos": listing.photos,
        "host_rating": host.rating if host else None,
        "host_total_bookings": host.total_bookings if host else 0,
        "distance_miles": distance,
    }
