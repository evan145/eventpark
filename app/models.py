import enum
import re
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, Time,
    ForeignKey, Text, JSON, Enum as SAEnum, UniqueConstraint, CheckConstraint,
    event,
)
from sqlalchemy.orm import relationship, validates
from .database import Base


class UserRole(str, enum.Enum):
    host = "host"
    guest = "guest"
    admin = "admin"


class ListingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    inactive = "inactive"


class BookingStatus(str, enum.Enum):
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


def _utcnow():
    return datetime.now(timezone.utc)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole, native_enum=False, length=20), nullable=False, default=UserRole.guest, server_default="guest")
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    host = relationship("Host", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="guest")

    @validates("email")
    def validate_email(self, key, value):
        if value is None:
            raise ValueError("email required")
        v = value.strip().replace("\x00", "")
        if not EMAIL_RE.match(v):
            raise ValueError("invalid email format")
        return v.lower()


class Host(Base):
    __tablename__ = "hosts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    address_verified = Column(Boolean, nullable=False, default=False, server_default="0")
    rating = Column(Float, nullable=False, default=5.0, server_default="5.0")
    total_bookings = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    user = relationship("User", back_populates="host")
    listings = relationship("Listing", back_populates="host", cascade="all, delete-orphan")

    @validates("rating")
    def validate_rating(self, key, value):
        if value is None:
            return value
        if value < 0 or value > 5:
            raise ValueError("rating must be between 0 and 5")
        return value


class Listing(Base):
    __tablename__ = "listings"
    id = Column(Integer, primary_key=True)
    host_id = Column(Integer, ForeignKey("hosts.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    number_of_spots = Column(Integer, nullable=False)
    price_per_spot = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=False)
    photos = Column(JSON, nullable=True)
    status = Column(SAEnum(ListingStatus, native_enum=False, length=20), nullable=False, default=ListingStatus.pending, server_default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    host = relationship("Host", back_populates="listings")
    event_listings = relationship("EventListing", back_populates="listing", cascade="all, delete-orphan")

    @validates("number_of_spots")
    def validate_spots(self, key, value):
        if value is None or value < 1:
            raise ValueError("number_of_spots must be >= 1")
        return value

    @validates("price_per_spot")
    def validate_price(self, key, value):
        if value is None or value <= 0:
            raise ValueError("price_per_spot must be > 0")
        return value


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    venue_name = Column(String(255), nullable=False)
    venue_address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    event_date = Column(Date, nullable=False)
    event_time = Column(Time, nullable=False)
    capacity = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    event_listings = relationship("EventListing", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("venue_name", "event_date", name="uq_event_venue_date"),)


class EventListing(Base):
    __tablename__ = "event_listings"
    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    available_spots = Column(Integer, nullable=False)
    price_override = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    event = relationship("Event", back_populates="event_listings")
    listing = relationship("Listing", back_populates="event_listings")
    bookings = relationship("Booking", back_populates="event_listing", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("event_id", "listing_id", name="uq_event_listing"),)

    @validates("available_spots")
    def validate_available(self, key, value):
        if value is None or value < 0:
            raise ValueError("available_spots must be >= 0")
        if self.listing is not None and value > self.listing.number_of_spots:
            raise ValueError("available_spots cannot exceed listing.number_of_spots")
        return value


class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True)
    event_listing_id = Column(Integer, ForeignKey("event_listings.id", ondelete="CASCADE"), nullable=False)
    guest_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    guest_name = Column(String(255), nullable=False)
    guest_email = Column(String(255), nullable=False)
    guest_phone = Column(String(50), nullable=False)
    spots_reserved = Column(Integer, nullable=False)
    total_price = Column(Float, nullable=False)
    status = Column(SAEnum(BookingStatus, native_enum=False, length=20), nullable=False, default=BookingStatus.confirmed, server_default="confirmed")
    stripe_payment_intent_id = Column(String(255), nullable=True)
    host_payout_amount = Column(Float, nullable=False, default=0.0)
    confirmation_code = Column(String(32), unique=True, nullable=False)
    dispute_resolution = Column(Text, nullable=True)
    refund_amount = Column(Float, nullable=False, default=0.0, server_default="0")
    payout_released = Column(Boolean, nullable=False, default=False, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    event_listing = relationship("EventListing", back_populates="bookings")
    guest = relationship("User", back_populates="bookings")
    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")

    @validates("spots_reserved")
    def validate_spots(self, key, value):
        if value is None or value < 1:
            raise ValueError("spots_reserved must be >= 1")
        return value


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    booking = relationship("Booking", back_populates="review")

    @validates("rating")
    def validate_rating(self, key, value):
        if value is None:
            raise ValueError("rating required")
        if not isinstance(value, int) or value < 1 or value > 5:
            raise ValueError("rating must be integer between 1 and 5")
        return value

    @validates("comment")
    def validate_comment(self, key, value):
        if value is None:
            return value
        if len(value) > 500:
            raise ValueError("comment must be <= 500 characters")
        return value


@event.listens_for(Booking, "before_insert")
def _booking_defaults(mapper, connection, target):
    if target.host_payout_amount is None or target.host_payout_amount == 0:
        target.host_payout_amount = round(float(target.total_price) * 0.80, 2)


def ensure_utc(dt: datetime) -> datetime:
    if dt is None:
        return dt
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
