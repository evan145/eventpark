import os
import re
import time
from urllib.parse import urlparse

import httpx
import jwt as pyjwt
import pytest

pytestmark = pytest.mark.deploy


# 1
def test_health_endpoint_responds(api):
    r = api.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# 2
def test_landing_page_loads_on_api_host(api):
    r = api.get("/")
    assert r.status_code == 200
    assert "EventPark" in r.text


# 3
def test_user_facing_landing_loads_on_vercel(web):
    r = web.get("/")
    assert r.status_code == 200
    assert "EventPark" in r.text


# 4
def test_sitemap_and_robots_served(api):
    s = api.get("/sitemap.xml")
    assert s.status_code == 200
    assert "<urlset" in s.text or "<sitemapindex" in s.text
    rb = api.get("/robots.txt")
    assert rb.status_code == 200
    assert "User-agent" in rb.text


# 5
def test_cors_allows_vercel_origin(api, web_url):
    r = api.options(
        "/api/events",
        headers={
            "Origin": web_url,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == web_url


# 6
def test_cors_blocks_other_origins(api):
    r = api.options(
        "/api/events",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.headers.get("access-control-allow-origin") != "https://evil.example"


# 7
def test_https_enforced(base_url):
    parsed = urlparse(base_url)
    plain = f"http://{parsed.netloc}/health"
    r = httpx.get(plain, follow_redirects=False, timeout=30.0)
    assert r.status_code in (301, 302, 307, 308)
    assert r.headers["location"].startswith("https://")


# 8
def test_admin_login_works(api):
    r = api.post(
        "/api/auth/login",
        json={"email": "admin@eventpark.test", "password": "password123"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "admin"
    assert isinstance(body["token"], str) and body["token"].count(".") == 2


# 9
def test_seeded_event_visible(api):
    r = api.get("/api/events")
    assert r.status_code == 200
    events = r.json()
    assert isinstance(events, list)
    assert any("Camp Randall" in (ev.get("venue_name") or "") for ev in events)


# 10
def test_register_login_roundtrip(api):
    unique = f"smoke-{int(time.time())}@eventpark.test"
    reg = api.post(
        "/api/auth/register",
        json={"email": unique, "password": "password123", "role": "guest"},
    )
    assert reg.status_code == 200, reg.text
    login = api.post(
        "/api/auth/login",
        json={"email": unique, "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["token"]
    me = api.get("/api/host/listings", headers={"Authorization": f"Bearer {token}"})
    # Guest hitting host endpoint should be 403, NOT 401 — proves token was accepted.
    assert me.status_code == 403


# 11
def test_booking_flow_against_seeded_listing(api):
    events = api.get("/api/events").json()
    target = next(ev for ev in events if "Camp Randall" in (ev.get("venue_name") or ""))
    spots = api.get(f"/api/events/{target['id']}/spots").json()
    assert spots, "no spots available for seeded event"
    spot = spots[0]
    book = api.post(
        "/api/bookings",
        json={
            "event_listing_id": spot["event_listing_id"],
            "guest_name": "Smoke Tester",
            "guest_email": f"smoke-{int(time.time())}@eventpark.test",
            "guest_phone": "608-555-0000",
            "spots_reserved": 1,
        },
    )
    assert book.status_code == 201, book.text
    body = book.json()
    assert re.match(r"^EP-\d{8}-[A-Z0-9]{4}$", body["confirmation_code"])


# 12
def test_invalid_token_rejected(api):
    r = api.get(
        "/api/host/listings",
        headers={"Authorization": "Bearer not.a.real.jwt"},
    )
    assert r.status_code == 401


# 13
def test_jwt_secret_is_not_dev_default(api):
    forged = pyjwt.encode(
        {"sub": "1", "email": "x@x.com", "role": "admin", "exp": 9999999999},
        "dev-secret-change-me",
        algorithm="HS256",
    )
    r = api.get("/api/host/listings", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401, "deployed JWT_SECRET appears to be the dev default"


# 14a
def test_stripe_loader_not_bundled(web):
    home = web.get("/").text
    bundle_match = re.search(r'src="(/assets/index-[^"]+\.js)"', home)
    if not bundle_match:
        pytest.fail("could not find main JS bundle in Vercel HTML")
    bundle = web.get(bundle_match.group(1)).text
    assert "js.stripe.com/v3" not in bundle, (
        "Stripe loader is bundled — VITE_PAYMENTS_ENABLED appears to be 'true' "
        "on Vercel. Set it to 'false' (or remove it) for beta."
    )


# 14b
# Selector notes (confirmed from source):
#   - Step 1 → Step 2: button text "Continue"  (matches /next|continue/i)
#   - Step 2 → Step 3: button text "Continue to payment"  (matches /next|continue/i)
#   - Step 2 labels: "Full name" (getByLabel(/full.name/i)), "Email", "Phone"
#   - SpotCards are <Link> elements (role="link"), not buttons — clicking opens ListingDetail
#   - Step 3 bypass button: "Continue (beta — no payment)"  (matches /continue.*beta/i)
def test_bypass_copy_renders_in_step3(web_url):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"{web_url}/")
        # Navigate to an event with "Camp Randall" in the title/venue
        page.get_by_text(re.compile("Camp Randall", re.I)).first.click()
        # SpotCards are links — click the first one to open ListingDetail with BookingFlow
        page.get_by_role("link", name=re.compile("spot|parking", re.I)).first.click()
        # Step 1: choose spots, then continue
        page.get_by_role("button", name=re.compile("continue", re.I)).first.click()
        # Step 2: fill contact form
        page.get_by_label(re.compile("full.name", re.I)).fill("Smoke Tester")
        page.get_by_label(re.compile("email", re.I)).fill(
            f"smoke-{int(time.time())}@eventpark.test"
        )
        page.get_by_label(re.compile("phone", re.I)).fill("608-555-0000")
        # Step 2 → Step 3: "Continue to payment" (matches /continue/i)
        page.get_by_role("button", name=re.compile("continue", re.I)).click()
        # Step 3: bypass button "Continue (beta — no payment)" (matches /continue.*beta/i)
        bypass_btn = page.get_by_role("button", name=re.compile("continue.*beta", re.I))
        bypass_btn.wait_for(timeout=10_000)
        assert bypass_btn.is_visible()
        assert page.locator("iframe[name^='__privateStripeFrame']").count() == 0
        browser.close()
