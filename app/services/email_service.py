CANCELLATION_POLICY_TEXT = (
    "Cancellation policy: Full refund if cancelled more than 48 hours before event. "
    "50% refund if cancelled 24-48 hours before. No refund within 24 hours of event."
)


def send_email(to: str, subject: str, body: str) -> dict:
    return {"to": to, "subject": subject, "body": body, "sent": True}


def send_booking_confirmation_to_guest(booking) -> dict:
    body = (
        f"Your EventPark booking is confirmed!\n"
        f"Confirmation: {booking.confirmation_code}\n"
        f"Spots: {booking.spots_reserved}\n"
        f"Total: ${booking.total_price:.2f}\n\n"
        f"{CANCELLATION_POLICY_TEXT}"
    )
    return send_email(booking.guest_email, "Your EventPark booking is confirmed", body)


def send_new_booking_to_host(booking) -> dict:
    host_email = None
    try:
        host_email = booking.event_listing.listing.host.user.email
    except Exception:
        host_email = "host@example.com"
    body = f"You have a new booking: {booking.confirmation_code} for {booking.spots_reserved} spots."
    return send_email(host_email, "New EventPark booking", body)


def send_listing_approved(listing) -> dict:
    host_email = listing.host.user.email
    return send_email(host_email, "Your listing was approved", f"Listing '{listing.title}' is now live.")


def send_listing_rejected(listing, reason: str | None = None) -> dict:
    host_email = listing.host.user.email
    return send_email(host_email, "Your listing was rejected", f"Listing '{listing.title}' was rejected. Reason: {reason or 'not specified'}")


def send_event_reminder_to_host(booking) -> dict:
    try:
        host_email = booking.event_listing.listing.host.user.email
    except Exception:
        host_email = "host@example.com"
    return send_email(host_email, "Event tomorrow — booking reminder", f"Booking {booking.confirmation_code} is 24 hours away.")


def send_event_reminder_to_guest(booking) -> dict:
    try:
        listing = booking.event_listing.listing
        directions = f"https://www.google.com/maps/dir/?api=1&destination={listing.latitude},{listing.longitude}"
    except Exception:
        directions = ""
    body = f"Your event is in 4 hours. Directions: {directions}"
    return send_email(booking.guest_email, "Event reminder — directions to your spot", body)


def send_pre_event_reminders(now, db):
    from datetime import datetime, timedelta, timezone, time as dt_time
    from ..models import Booking, BookingStatus

    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    sent = []
    bookings = db.query(Booking).filter(Booking.status == BookingStatus.confirmed).all()
    for b in bookings:
        ev = b.event_listing.event
        event_dt = datetime.combine(ev.event_date, ev.event_time).replace(tzinfo=timezone.utc)
        delta = event_dt - now
        hours = delta.total_seconds() / 3600.0
        if 23.0 <= hours <= 25.0:
            sent.append(send_event_reminder_to_host(b))
        if 3.0 <= hours <= 5.0:
            sent.append(send_event_reminder_to_guest(b))
    return sent
