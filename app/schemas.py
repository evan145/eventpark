from datetime import date, time, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Optional[str] = "guest"
    full_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token: str
    user: UserOut


class HostProfileCreate(BaseModel):
    full_name: str
    address: str
    phone: Optional[str] = None


class HostProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    address: str
    address_verified: bool
    rating: float
    total_bookings: int

    class Config:
        from_attributes = True


class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    number_of_spots: int = Field(ge=1)
    price_per_spot: float = Field(gt=0)
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_base64: Optional[str] = None
    photos: Optional[List[str]] = None


class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    number_of_spots: Optional[int] = Field(default=None, ge=1)
    price_per_spot: Optional[float] = Field(default=None, gt=0)
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ListingOut(BaseModel):
    id: int
    host_id: int
    title: str
    description: Optional[str]
    number_of_spots: int
    price_per_spot: float
    latitude: float
    longitude: float
    address: str
    status: str
    photos: Optional[Any] = None

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    name: str
    venue_name: str
    venue_address: str
    latitude: float
    longitude: float
    event_date: date
    event_time: time
    capacity: Optional[int] = None
    description: Optional[str] = None


class EventOut(BaseModel):
    id: int
    name: str
    venue_name: str
    venue_address: str
    latitude: float
    longitude: float
    event_date: date
    event_time: time

    class Config:
        from_attributes = True


class BookingCreate(BaseModel):
    event_listing_id: int
    guest_name: Optional[str] = None
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = None
    spots_reserved: int = Field(ge=1)


class BookingOut(BaseModel):
    id: int
    event_listing_id: int
    guest_name: str
    guest_email: str
    guest_phone: str
    spots_reserved: int
    total_price: float
    status: str
    stripe_payment_intent_id: Optional[str]
    host_payout_amount: float
    confirmation_code: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)


class ListingStatusPatch(BaseModel):
    status: str
    reason: Optional[str] = None


class DisputeCreate(BaseModel):
    booking_id: int
    resolution: str
