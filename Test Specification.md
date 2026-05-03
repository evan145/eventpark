# EventPark — Test Specification

> These tests define the acceptance criteria for every feature in the MVP. A builder agent should implement each unit/integration test and verify it passes before considering a sprint complete.

---

## Test Configuration

```
Framework: pytest
Database: SQLite (tests) / PostgreSQL (prod)
Testing approach: Unit tests for business logic, integration tests for API endpoints
Mock: Stripe charges, emails, payouts
```

---

## 1. Database Schema Tests

### 1.1 Users Table

```python
def test_users_table_has_required_columns():
    # Expected columns: id, email, password_hash, role (enum: host|guest|admin),
    # phone (nullable), created_at, updated_at
    pass

def test_user_role_defaults_to_guest():
    # New users without explicit role default to 'guest'
    pass

def test_user_email_is_unique():
    # Inserting duplicate email raises UniqueViolation
    pass

def test_user_requires_valid_email():
    # Invalid email format rejected at DB level or validation layer
    pass
```

### 1.2 Hosts Table

```python
def test_hosts_table_has_required_columns():
    # Expected columns: id, user_id (FK to users), full_name, address,
    # address_verified (bool, default False), rating (float, default 5.0),
    # total_bookings (int, default 0), created_at
    pass

def test_host_user_id_is_foreign_key_to_users():
    # Deleting a user cascades to their host profile
    pass

def test_host_rating_bounded_between_0_and_5():
    # Rating cannot be set below 0 or above 5
    pass

def test_host_one_per_user():
    # A user can only have one host profile
    pass
```

### 1.3 Listings Table

```python
def test_listings_table_has_required_columns():
    # Expected columns: id, host_id (FK to hosts), title, description (nullable),
    # number_of_spots (int), price_per_spot (float), latitude, longitude,
    # address (text), photos (JSON array, nullable), status
    #   (enum: pending|approved|rejected|inactive), created_at, updated_at
    pass

def test_listing_status_defaults_to_pending():
    # New listings require admin approval before going live
    pass

def test_listing_number_of_spots_positive():
    # Must be >= 1
    pass

def test_listing_price_positive():
    # Price must be > 0
    pass

def test_listing_requires_geocoordinates():
    # latitude and longitude must not be null
    pass
```

### 1.4 Events Table

```python
def test_events_table_has_required_columns():
    # Expected columns: id, name, venue_name, venue_address,
    # latitude, longitude, event_date, event_time, capacity (nullable),
    # description (nullable), created_at
    pass

def test_event_date_unique_per_venue():
    # Same venue on same date = duplicate error
    pass
```

### 1.5 EventListings (Junction Table)

```python
def test_event_listings_table_has_required_columns():
    # Expected columns: id, event_id (FK), listing_id (FK),
    # available_spots (int), price_override (float, nullable),
    # created_at
    pass

def test_event_listing_prevents_duplicate():
    # Same listing cannot be assigned to same event twice
    pass

def test_available_spots_does_not_exceed_listing_capacity():
    # available_spots <= listing.number_of_spots
    pass
```

### 1.6 Bookings Table

```python
def test_bookings_table_has_required_columns():
    # Expected columns: id, event_listing_id (FK), guest_id (FK to users),
    # guest_name, guest_email, guest_phone, spots_reserved (int),
    # total_price (float), status (enum: confirmed|cancelled|completed|no_show),
    # stripe_payment_intent_id, host_payout_amount (float), created_at
    pass

def test_booking_spots_reserved_positive():
    # Must be >= 1
    pass

def test_booking_total_price_matches_calculation():
    # total_price = spots_reserved * unit_price
    pass

def test_booking_host_payout_is_80_percent():
    # host_payout_amount = total_price * 0.80
    pass
```

### 1.7 Reviews Table

```python
def test_reviews_table_has_required_columns():
    # Expected columns: id, booking_id (FK), rating (int 1-5),
    # comment (nullable), created_at
    pass

def test_review_unique_per_booking():
    # One review per booking maximum
    pass

def test_review_rating_in_valid_range():
    # Must be integer between 1 and 5
    pass
```

---

## 2. Authentication Tests

### 2.1 Registration

```python
def test_guest_registration_creates_user_with_guest_role():
    """POST /api/auth/register with guest payload creates user"""
    pass

def test_host_registration_creates_user_with_host_role():
    """POST /api/auth/register with host payload creates user + pending host profile"""
    pass

def test_registration_rejects_duplicate_email():
    """POST /api/auth/register with existing email returns 409"""
    pass

def test_registration_requires_email_and_password():
    """POST /api/auth/register missing email or password returns 400"""
    pass

def test_registration_password_min_length():
    """Password shorter than 8 characters returns 400"""
    pass

def test_registration_returns_jwt_token():
    """Successful registration returns JWT in response"""
    pass
```

### 2.2 Login

```python
def test_login_returns_jwt_token():
    """POST /api/auth/login with valid credentials returns JWT"""
    pass

def test_login_rejects_invalid_password():
    """POST /api/auth/login with wrong password returns 401"""
    pass

def test_login_rejects_nonexistent_email():
    """POST /api/auth/login with unknown email returns 401"""
    pass

def test_login_token_has_expiry():
    """Returned JWT contains exp claim, valid for 24 hours"""
    pass
```

### 2.3 Token Protection

```python
def test_protected_endpoint_rejects_missing_token():
    """GET /api/host/listings without Authorization header returns 401"""
    pass

def test_protected_endpoint_rejects_expired_token():
    """GET with expired JWT returns 401"""
    pass

def test_protected_endpoint_rejects_invalid_token():
    """GET with malformed JWT returns 401"""
    pass

def test_protected_endpoint_succeeds_with_valid_token():
    """GET /api/host/listings with valid JWT returns 200"""
    pass
```

---

## 3. Host Onboarding Tests

### 3.1 Profile Creation

```python
def test_host_can_create_profile():
    """POST /api/host/profile creates profile with name, address"""
    payload = {
        "full_name": "John Doe",
        "address": "123 Stadium Ave, Madison, WI 53706",
        "phone": "608-555-0100"
    }
    # Returns 201, address_verified=False

def test_host_profile_requires_address():
    """POST /api/host/profile without address returns 400"""
    pass

def test_host_cannot_create_duplicate_profile():
    """Second POST /api/host/profile for same user returns 409"""
    pass

def test_guest_cannot_access_host_profile_endpoint():
    """Non-host user POST /api/host/profile returns 403"""
    pass
```

### 3.2 Listing Creation

```python
def test_host_can_create_listing():
    """POST /api/host/listings creates new listing with status=pending"""
    payload = {
        "title": "Spacious Driveway Near Camp Randall",
        "description": "Flat concrete driveway, easy access",
        "number_of_spots": 4,
        "price_per_spot": 15.00,
        "address": "123 Stadium Ave, Madison, WI 53706",
        "latitude": 43.0642,
        "longitude": -89.4142
    }
    # Returns 201, status="pending"

def test_listing_requires_minimum_fields():
    """Missing title, number_of_spots, or price returns 400"""
    pass

def test_listing_rejects_zero_spots():
    """number_of_spots=0 returns 400"""
    pass

def test_listing_rejects_negative_price():
    """price_per_spot=-5 returns 400"""
    pass

def test_listing_geo_coordinates_auto_generated_from_address():
    """If lat/lng not provided, system geocodes address (mocked in tests)"""
    pass

def test_host_can_only_see_own_listings():
    """GET /api/host/listings only returns listings for authenticated host"""
    pass

def test_listing_with_photo_upload():
    """POST /api/host/listings with photo attachment stores photo reference"""
    pass
```

### 3.3 Listing Management

```python
def test_host_can_edit_own_listing():
    """PUT /api/host/listings/:id updates fields"""
    pass

def test_host_cannot_edit_other_listing():
    """PUT /api/host/listings/:id on another host's listing returns 403"""
    pass

def test_host_can_delete_own_listing():
    """DELETE /api/host/listings/:id soft-deletes (status=inactive)"""
    pass

def test_host_can_view_listing_status():
    """GET /api/host/listings/:id returns current status"""
    pass
```

---

## 4. Admin Tests

### 4.1 Listing Approval

```python
def test_admin_can_approve_listing():
    """PATCH /api/admin/listings/:id/status with status='approved' returns 200"""
    pass

def test_admin_can_reject_listing():
    """PATCH /api/admin/listings/:id/status with status='rejected' returns 200"""
    pass

def test_non_admin_cannot_approve_listing():
    """Non-admin user PATCH returns 403"""
    pass

def test_admin_can_view_pending_listings():
    """GET /api/admin/listings?status=pending returns only pending"""
    pass

def test_admin_can_view_all_bookings():
    """GET /api/admin/bookings returns all bookings"""
    pass

def test_admin_can_view_revenue_summary():
    """GET /api/admin/analytics/revenue returns total commission earned"""
    pass

def test_admin_can_handle_dispute():
    """POST /api/admin/disputes with booking_id and resolution"""
    pass
```

### 4.2 Event Management

```python
def test_admin_can_create_event():
    """POST /api/admin/events creates new event"""
    payload = {
        "name": "Wisconsin vs. Michigan",
        "venue_name": "Camp Randall Stadium",
        "venue_address": "300 Spence Steen Ave, Madison, WI 53706",
        "event_date": "2026-09-26",
        "event_time": "12:00:00"
    }
    # Returns 201

def test_admin_can_delete_event():
    """DELETE /api/admin/events/:id removes event and associated event_listings"""
    pass

def test_admin_can_view_event_bookings():
    """GET /api/admin/events/:id/bookings returns all bookings for event"""
    pass
```

---

## 5. Event / Listing Discovery Tests

### 5.1 Event Listing

```python
def test_public_can_browse_events():
    """GET /api/events returns list of upcoming events"""
    pass

def test_events_sorted_by_date_ascending():
    """Events returned in chronological order"""
    pass

def test_events_filtered_by_venue():
    """GET /api/events?venue=Camp Randall returns only matching events"""
    pass

def test_event_detail_returns_available_spots_count():
    """GET /api/events/:id includes total available spots across all listings"""
    pass
```

### 5.2 Spot Search

```python
def test_public_can_browse_spots_for_event():
    """GET /api/events/:id/spots returns approved listings for that event"""
    pass

def test_spots_sorted_by_price_ascending():
    """GET /api/events/:id/spots?sort=price returns cheapest first"""
    pass

def test_spots_filtered_by_max_price():
    """GET /api/events/:id/spots?max_price=20 excludes spots over $20"""
    pass

def test_spots_filtered_by_min_spots():
    """GET /api/events/:id/spots?min_spots=3 excludes listings with <3 spots"""
    pass

def test_spots_filtered_by_radius():
    """GET /api/events/:id/spots?radius=2 excludes spots >2 miles from venue"""
    pass

def test_rejected_listings_not_visible():
    """Listings with status=pending or status=rejected do not appear in search"""
    pass

def test_inactive_listings_not_visible():
    """Listings with status=inactive do not appear in search"""
    pass

def test_spot_detail_includes_host_rating():
    """GET /api/listings/:id returns host rating and booking count"""
    pass

def test_spot_detail_includes_distance_to_venue():
    """Spot detail includes calculated distance in miles"""
    pass
```

---

## 6. Booking Flow Tests

### 6.1 Create Booking

```python
def test_guest_can_book_spots():
    """POST /api/bookings creates booking with guest info + payment"""
    payload = {
        "event_listing_id": 1,
        "guest_name": "Jane Smith",
        "guest_email": "jane@example.com",
        "guest_phone": "608-555-0200",
        "spots_reserved": 2
    }
    # Returns 201 with booking details + confirmation

def test_booking_calculates_total_correctly():
    """total_price = spots_reserved * price (or price_override if set)"""
    pass

def test_booking_reduces_available_spots():
    """After booking, event_listing.available_spots decreases by spots_reserved"""
    pass

def test_booking_fails_when_no_spots_available():
    """Booking requesting more spots than available returns 409"""
    pass

def test_booking_requires_guest_contact_info():
    """Missing guest_email or guest_phone returns 400"""
    pass

def test_guest_booking_does_not_require_account():
    """Guest can book without being registered (provide inline contact info)"""
    pass

def test_authenticated_guest_bookings_auto_fill_contact():
    """Logged-in guest sees pre-filled name/email from account"""
    pass

def test_booking_confirmation_number_generated():
    """Each booking gets a unique confirmation code (e.g., EP-20260515-ABCD)"""
    pass
```

### 6.2 Booking Cancellation

```python
def test_cancel_48hrs_before_returns_full_refund():
    """Cancel >48hrs before event → status='cancelled', full refund issued"""
    pass

def test_cancel_24_to_48hrs_returns_partial_refund():
    """Cancel 24-48hrs before event → 50% refund"""
    pass

def test_cancel_less_than_24hrs_no_refund():
    """Cancel <24hrs before event → no refund, booking cancelled"""
    pass

def test_cancel_restores_available_spots():
    """Cancelled booking increases available_spots back"""
    pass

def test_cancel_completed_booking_rejected():
    """Cannot cancel a booking with status='completed' returns 400"""
    pass

def test_guest_can_only_cancel_own_booking():
    """Cancel another guest's booking returns 403"""
    pass
```

### 6.3 Booking Details

```python
def test_guest_can_view_booking_confirmation():
    """GET /api/bookings/:id returns booking details + GPS link + host info"""
    pass

def test_confirmation_includes_host_contact():
    """Booking confirmation includes host name and phone for day-of coordination"""
    pass

def test_confirmation_includes_spot_directions():
    """Confirmation includes Google Maps / Apple Maps URL to spot address"""
    pass

def test_host_can_view_upcoming_bookings():
    """GET /api/host/bookings/upcoming returns bookings for host's listings"""
    pass

def test_host_cannot_see_guest_pii_before_booking():
    """Host cannot view guest details before booking is confirmed"""
    pass
```

---

## 7. Payment Processing Tests (Mocked Stripe)

### 7.1 Charge Processing

```python
def test_payment_intent_created_on_booking():
    """Booking creation triggers Stripe PaymentIntent via Stripe Connect"""
    pass

def test_platform_retains_20_percent_commission():
    """Application fee on PaymentIntent equals 20% of total"""
    pass

def test_host_receives_80_percent_payout():
    """Transfer amount to connected host account equals 80% of total"""
    pass

def test_stripe_fees_deducted_from_commission():
    """Stripe processing fees (2.9% + $0.30) deducted from platform's share"""
    pass

def test_failed_payment_rejects_booking():
    """Stripe payment failure → booking not created, error returned"""
    pass

def test_payment_intent_stores_on_booking_record():
    """booking.stripe_payment_intent_id set after successful charge"""
    pass
```

### 7.2 Refunds

```python
def test_full_refund_issues_charge_reverse():
    """Full refund calls Stripe refund API for full amount"""
    pass

def test_partial_refund_issues_proportional_charge_reverse():
    """50% refund calls Stripe refund API for 50% of amount"""
    pass

def test_refund_updates_booking_status():
    """After refund, booking status changes to 'cancelled'"""
    pass

def test_no_double_refund():
    """Already cancelled booking cannot be refunded again"""
    pass
```

### 7.3 Payouts

```python
def test_host_payout_held_until_post_event():
    """Funds not released to host until 24 hours after event ends"""
    pass

def test_payout_amount_records_on_booking():
    """Booking record stores host_payout_amount at creation time"""
    pass

def test_host_can_view_earnings_summary():
    """GET /api/host/earnings returns completed booking payouts"""
    pass
```

---

## 8. Review System Tests

```python
def test_guest_can_review_completed_booking():
    """POST /api/reviews with booking_id and rating creates review"""
    pass

def test_review_only_for_completed_bookings():
    """Reviewing non-completed booking returns 400"""
    pass

def test_one_review_per_booking():
    """Second review for same booking returns 409"""
    pass

def test_review_updates_host_rating():
    """New review recalculates host average rating"""
    pass

def test_host_increases_booking_count_on_review():
    """Review confirms booking is complete, increments host.total_bookings"""
    pass

def test_guest_only_reviews_own_bookings():
    """Reviewing another guest's booking returns 403"""
    pass

def test_review_with_optional_comment():
    """Review with only rating (no comment) succeeds"""
    pass

def test_review_comment_truncated_at_500_chars():
    """Comment exceeding 500 characters returns 400"""
    pass
```

---

## 9. Email / Notification Tests (Mocked)

```python
def test_host_notified_on_new_booking():
    """New booking triggers email notification to host"""
    pass

def test_guest_receives_booking_confirmation():
    """Guest receives confirmation email with booking details"""
    pass

def test_confirmation_email_includes_cancellation_policy():
    """Email body contains cancellation window information"""
    pass

def test_host_notified_before_event():
    """Reminder email sent to host 24 hours before event"""
    pass

def test_guest_notified_before_event():
    """Reminder email sent to guest 4 hours before event with directions"""
    pass

def test_host_notified_of_approval():
    """Approved listing triggers notification email"""
    pass

def test_host_notified_of_rejection():
    """Rejected listing triggers email with reason"""
    pass

def test_no_email_sent_for_test_accounts():
    """Test/mock accounts do not trigger real emails"""
    pass
```

---

## 10. Landing Page / SEO Tests

```python
def test_landing_page_returns_200():
    """GET / renders landing page successfully"""
    pass

def test_landing_page_has_meta_title():
    """<title> contains 'EventPark'"""
    pass

def test_landing_page_has_meta_description():
    """<meta name='description'> present and non-empty"""
    pass

def test_sitemap_returns_200():
    """GET /sitemap.xml returns valid XML"""
    pass

def test_robots_txt_returns_200():
    """GET /robots.txt returns valid robots directives"""
    pass

def test_api_has_rate_limiting():
    """Rapid requests to /api endpoints return 429 after threshold"""
    pass

def test_https_redirect():
    """HTTP request redirects to HTTPS"""
    pass
```

---

## 11. Edge Cases & Error Handling

```python
def test_concurrent_bookings_do_not_overbook():
    """Two simultaneous booking requests for last spot → one succeeds, one 409s"""
    pass

def test_booking_on_deleted_event_returns_404():
    """Booking for deleted event returns 404"""
    pass

def test_null_bytes_in_input_sanitized():
    """Null bytes in guest_name stripped or rejected"""
    pass

def test_sql_injection_in_search_rejected():
    """SQL injection attempt in search query returns no results, no error"""
    pass

def test_xss_in_review_comment_escaped():
    """<script> tag in review comment rendered as text, not executed"""
    pass

def test_large_photo_upload_rejected():
    """Photo >10MB returns 413"""
    pass

def test_deleted_host_listings_inaccessible():
    """GET /api/listings/:id for deleted listing returns 404"""
    pass

def test_booking_past_event_rejected():
    """Cannot book for event in the past"""
    pass

def test_future_date_in_past_rejected():
    """Cannot create event with date before today"""
    pass

def test_timezone_consistency():
    """All dates stored in UTC, displayed in user's local timezone"""
    pass
```

---

## 12. Integration / End-to-End Tests

### 12.1 Full Booking Lifecycle

```python
def test_e2e_host_lists_spots_guest_books_and_reviews():
    """
    Full flow:
    1. Admin creates event
    2. Host creates listing for event
    3. Admin approves listing
    4. Guest searches, finds listing
    5. Guest books 2 spots, payment processed
    6. Available spots decreases
    7. Both host and guest receive confirmation emails
    8. Event passes (time mocked)
    9. Guest leaves review
    10. Host rating updates
    11. Host payout released
    """
    pass

def test_e2e_guest_cancels_booking_with_refund():
    """
    Full cancel flow:
    1. Guest books spots
    2. Guest cancels >48hrs before event
    3. Full refund issued via Stripe
    4. Available spots restored
    5. Booking status = 'cancelled'
    """
    pass

def test_e2e_multiple_hosts_same_event():
    """
    Multiple hosts listing same event:
    1. Host A and Host B both list for Event X
    2. Guest can see both in search results
    3. Bookings against different hosts tracked separately
    4. Payouts go to correct hosts
    """
    pass

def test_e2e_host_earnings_dashboard():
    """
    Host views earnings:
    1. Host has 5 completed bookings
    2. GET /api/host/earnings returns correct totals
    3. Pending payouts excluded from earned total
    """
    pass
```

---

## Test Data Fixtures

```python
# Standard test host
HOST_FIXTURE = {
    "email": "host@test.com",
    "password": "password123",
    "full_name": "Test Host",
    "address": "123 Stadium Ave, Madison, WI 53706",
    "phone": "608-555-0100"
}

# Standard test guest
GUEST_FIXTURE = {
    "email": "guest@test.com",
    "password": "password123",
    "guest_name": "Test Guest",
    "guest_email": "guest@test.com",
    "guest_phone": "608-555-0200"
}

# Standard test event
EVENT_FIXTURE = {
    "name": "Wisconsin vs. Michigan",
    "venue_name": "Camp Randall Stadium",
    "venue_address": "300 Spence Steen Ave, Madison, WI 53706",
    "event_date": "2026-09-26",
    "event_time": "12:00:00",
    "latitude": 43.0642,
    "longitude": -89.4142
}

# Standard test listing
LISTING_FIXTURE = {
    "title": "Driveway Near Stadium",
    "number_of_spots": 4,
    "price_per_spot": 15.00,
    "latitude": 43.0650,
    "longitude": -89.4150
}
```

---

## Test Runner Commands

```bash
# Run all tests
pytest tests/ -v

# Run specific test category
pytest tests/test_auth.py -v
pytest tests/test_bookings.py -v

# Run with coverage report
pytest tests/ --cov=app --cov-report=html

# Run integration tests only
pytest tests/ -m integration -v

# Run with database reset
pytest tests/ --db-reset
```

## Coverage Target

> Aim for **80%+ code coverage** across business logic and API endpoints. Database schema and utility functions should reach 90%+.