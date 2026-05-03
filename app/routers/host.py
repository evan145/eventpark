import base64
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from ..database import get_db
from ..models import User, Host, Listing, ListingStatus, Booking, BookingStatus, EventListing, Event
from ..deps import get_current_user, require_role
from ..config import settings
from ..services import geocoding

router = APIRouter(prefix="/api/host", tags=["host"])


def _require_host(user: User):
    if user.role.value != "host":
        raise HTTPException(status_code=403, detail="host role required")


def _strip_nulls(value):
    if isinstance(value, str):
        return value.replace("\x00", "")
    return value


@router.post("/profile", status_code=201)
async def create_profile(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create a host profile for the authenticated user."""
    _require_host(user)
    data = await request.json()
    full_name = _strip_nulls(data.get("full_name"))
    address = _strip_nulls(data.get("address"))
    phone = _strip_nulls(data.get("phone"))
    if not address:
        raise HTTPException(status_code=400, detail="address required")
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name required")
    existing = db.query(Host).filter(Host.user_id == user.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="host profile already exists")
    host = Host(user_id=user.id, full_name=full_name, address=address)
    db.add(host)
    if phone:
        user.phone = phone
    db.commit()
    db.refresh(host)
    return {
        "id": host.id, "user_id": host.user_id, "full_name": host.full_name,
        "address": host.address, "address_verified": host.address_verified,
        "rating": host.rating, "total_bookings": host.total_bookings,
    }


@router.get("/profile")
async def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get the authenticated host's profile."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    if not host:
        raise HTTPException(status_code=404, detail="profile not found")
    return {
        "id": host.id, "user_id": host.user_id, "full_name": host.full_name,
        "address": host.address, "address_verified": host.address_verified,
        "rating": host.rating, "total_bookings": host.total_bookings,
    }


@router.post("/listings", status_code=201)
async def create_listing(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Create a new listing (status pending)."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    if not host:
        raise HTTPException(status_code=400, detail="host profile required")

    content_type = (request.headers.get("content-type") or "").lower()
    photos = None
    if content_type.startswith("multipart/"):
        form = await request.form()
        title = form.get("title")
        description = form.get("description")
        try:
            number_of_spots = int(form.get("number_of_spots") or 0)
            price_per_spot = float(form.get("price_per_spot") or 0)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="invalid numeric fields")
        address = form.get("address")
        latitude = form.get("latitude")
        longitude = form.get("longitude")
        latitude = float(latitude) if latitude not in (None, "") else None
        longitude = float(longitude) if longitude not in (None, "") else None
        photo = form.get("photo")
        if photo is not None and hasattr(photo, "read"):
            data = await photo.read()
            if len(data) > settings.MAX_PHOTO_BYTES:
                raise HTTPException(status_code=413, detail="photo too large")
            photos = [f"upload:{photo.filename}:{len(data)}"]
    else:
        data = await request.json()
        title = _strip_nulls(data.get("title"))
        description = _strip_nulls(data.get("description"))
        number_of_spots = data.get("number_of_spots")
        price_per_spot = data.get("price_per_spot")
        address = _strip_nulls(data.get("address"))
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        photo_b64 = data.get("photo_base64")
        if photo_b64:
            try:
                raw = base64.b64decode(photo_b64)
            except Exception:
                raise HTTPException(status_code=400, detail="invalid base64 photo")
            if len(raw) > settings.MAX_PHOTO_BYTES:
                raise HTTPException(status_code=413, detail="photo too large")
            photos = [f"base64:{len(raw)}"]
        if isinstance(data.get("photos"), list):
            photos = data.get("photos")

    if not title:
        raise HTTPException(status_code=400, detail="title required")
    if number_of_spots is None:
        raise HTTPException(status_code=400, detail="number_of_spots required")
    if price_per_spot is None:
        raise HTTPException(status_code=400, detail="price_per_spot required")
    if not address:
        raise HTTPException(status_code=400, detail="address required")
    try:
        number_of_spots = int(number_of_spots)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="number_of_spots must be int")
    try:
        price_per_spot = float(price_per_spot)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="price_per_spot must be number")
    if number_of_spots < 1:
        raise HTTPException(status_code=400, detail="number_of_spots must be >= 1")
    if price_per_spot <= 0:
        raise HTTPException(status_code=400, detail="price_per_spot must be > 0")

    if latitude is None or longitude is None:
        latitude, longitude = geocoding.geocode_address(address)

    try:
        listing = Listing(
            host_id=host.id, title=title, description=description,
            number_of_spots=number_of_spots, price_per_spot=price_per_spot,
            address=address, latitude=latitude, longitude=longitude, photos=photos,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return {
        "id": listing.id, "host_id": listing.host_id, "title": listing.title,
        "description": listing.description, "number_of_spots": listing.number_of_spots,
        "price_per_spot": listing.price_per_spot, "latitude": listing.latitude,
        "longitude": listing.longitude, "address": listing.address,
        "status": listing.status.value, "photos": listing.photos,
    }


@router.get("/listings")
async def list_my_listings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List the authenticated host's listings."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    if not host:
        return []
    listings = db.query(Listing).filter(Listing.host_id == host.id).all()
    return [
        {"id": l.id, "host_id": l.host_id, "title": l.title, "description": l.description,
         "number_of_spots": l.number_of_spots, "price_per_spot": l.price_per_spot,
         "latitude": l.latitude, "longitude": l.longitude, "address": l.address,
         "status": l.status.value, "photos": l.photos}
        for l in listings
    ]


@router.get("/listings/{listing_id}")
async def get_my_listing(listing_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Get one of the host's own listings."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")
    if not host or listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="not your listing")
    return {
        "id": listing.id, "host_id": listing.host_id, "title": listing.title,
        "description": listing.description, "number_of_spots": listing.number_of_spots,
        "price_per_spot": listing.price_per_spot, "latitude": listing.latitude,
        "longitude": listing.longitude, "address": listing.address,
        "status": listing.status.value, "photos": listing.photos,
    }


@router.put("/listings/{listing_id}")
async def update_listing(listing_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Update one of the host's listings."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")
    if not host or listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="not your listing")
    data = await request.json()
    for field in ("title", "description", "address"):
        if field in data and data[field] is not None:
            setattr(listing, field, _strip_nulls(data[field]))
    if "number_of_spots" in data and data["number_of_spots"] is not None:
        try:
            listing.number_of_spots = int(data["number_of_spots"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if "price_per_spot" in data and data["price_per_spot"] is not None:
        try:
            listing.price_per_spot = float(data["price_per_spot"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if "latitude" in data and data["latitude"] is not None:
        listing.latitude = float(data["latitude"])
    if "longitude" in data and data["longitude"] is not None:
        listing.longitude = float(data["longitude"])
    db.commit()
    db.refresh(listing)
    return {
        "id": listing.id, "host_id": listing.host_id, "title": listing.title,
        "description": listing.description, "number_of_spots": listing.number_of_spots,
        "price_per_spot": listing.price_per_spot, "latitude": listing.latitude,
        "longitude": listing.longitude, "address": listing.address,
        "status": listing.status.value, "photos": listing.photos,
    }


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Soft-delete (mark inactive) one of the host's listings."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    listing = db.query(Listing).filter(Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")
    if not host or listing.host_id != host.id:
        raise HTTPException(status_code=403, detail="not your listing")
    listing.status = ListingStatus.inactive
    db.commit()
    return {"id": listing.id, "status": listing.status.value}


@router.get("/bookings/upcoming")
async def upcoming_bookings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """List upcoming bookings against the host's listings."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    if not host:
        return []
    now = datetime.now(timezone.utc).date()
    bookings = (
        db.query(Booking)
        .join(EventListing, Booking.event_listing_id == EventListing.id)
        .join(Listing, EventListing.listing_id == Listing.id)
        .join(Event, EventListing.event_id == Event.id)
        .filter(Listing.host_id == host.id)
        .filter(Event.event_date >= now)
        .all()
    )
    out = []
    for b in bookings:
        if b.status == BookingStatus.confirmed:
            out.append({
                "id": b.id, "guest_name": b.guest_name, "guest_email": b.guest_email,
                "guest_phone": b.guest_phone, "spots_reserved": b.spots_reserved,
                "total_price": b.total_price, "status": b.status.value,
                "confirmation_code": b.confirmation_code,
            })
    return out


@router.get("/earnings")
async def earnings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Host earnings summary: completed payouts and pending."""
    _require_host(user)
    host = db.query(Host).filter(Host.user_id == user.id).first()
    if not host:
        return {"total_earned": 0.0, "pending": 0.0, "bookings": []}
    bookings = (
        db.query(Booking)
        .join(EventListing, Booking.event_listing_id == EventListing.id)
        .join(Listing, EventListing.listing_id == Listing.id)
        .filter(Listing.host_id == host.id)
        .all()
    )
    total_earned = 0.0
    pending = 0.0
    out = []
    for b in bookings:
        if b.status == BookingStatus.completed:
            total_earned += float(b.host_payout_amount)
        elif b.status == BookingStatus.confirmed:
            pending += float(b.host_payout_amount)
        out.append({
            "booking_id": b.id, "status": b.status.value,
            "host_payout_amount": b.host_payout_amount,
            "payout_released": b.payout_released,
        })
    return {"total_earned": round(total_earned, 2), "pending": round(pending, 2), "bookings": out}
