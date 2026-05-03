def _book_complete(client, admin_user, approved_listing, guest_user=None):
    headers = guest_user["headers"] if guest_user else None
    payload = {
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "Jane", "guest_email": "guest@test.com",
        "guest_phone": "608", "spots_reserved": 1,
    }
    rb = client.post("/api/bookings", json=payload, headers=headers)
    bid = rb.json()["id"]
    client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])
    return bid, rb.json()


def test_guest_can_review_completed_booking(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5, "comment": "Great"},
                    headers=guest_user["headers"])
    assert r.status_code == 201


def test_review_only_for_completed_bookings(client, approved_listing, guest_user):
    rb = client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "spots_reserved": 1,
    }, headers=guest_user["headers"])
    bid = rb.json()["id"]
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                    headers=guest_user["headers"])
    assert r.status_code == 400


def test_one_review_per_booking(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                headers=guest_user["headers"])
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 4},
                    headers=guest_user["headers"])
    assert r.status_code == 409


def test_review_updates_host_rating(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 3},
                    headers=guest_user["headers"])
    assert r.json()["host_rating"] == 3.0


def test_host_increases_booking_count_on_review(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                    headers=guest_user["headers"])
    assert r.json()["host_total_bookings"] == 1


def test_guest_only_reviews_own_bookings(client, admin_user, approved_listing):
    # Booking made anonymously w/ a specific email
    rb = client.post("/api/bookings", json={
        "event_listing_id": approved_listing["event_listing"]["id"],
        "guest_name": "G", "guest_email": "owner@x.com", "guest_phone": "0",
        "spots_reserved": 1,
    })
    bid = rb.json()["id"]
    client.post(f"/api/admin/bookings/{bid}/complete", headers=admin_user["headers"])
    other = client.post("/api/auth/register", json={
        "email": "other@x.com", "password": "password123", "role": "guest",
    })
    other_headers = {"Authorization": f"Bearer {other.json()['token']}"}
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                    headers=other_headers)
    assert r.status_code == 403


def test_review_with_optional_comment(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5},
                    headers=guest_user["headers"])
    assert r.status_code == 201


def test_review_comment_truncated_at_500_chars(client, admin_user, approved_listing, guest_user):
    bid, _ = _book_complete(client, admin_user, approved_listing, guest_user)
    long_comment = "x" * 501
    r = client.post("/api/reviews", json={"booking_id": bid, "rating": 5, "comment": long_comment},
                    headers=guest_user["headers"])
    assert r.status_code == 400
