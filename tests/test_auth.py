from datetime import datetime, timedelta, timezone
from app.auth import create_token, decode_token


def test_guest_registration_creates_user_with_guest_role(client):
    r = client.post("/api/auth/register", json={"email": "g1@x.com", "password": "password123"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "guest"


def test_host_registration_creates_user_with_host_role(client, db_setup):
    r = client.post("/api/auth/register", json={
        "email": "h1@x.com", "password": "password123", "role": "host",
        "full_name": "H", "address": "addr",
    })
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "host"
    _, TestSession = db_setup
    s = TestSession()
    try:
        from app.models import User, Host
        u = s.query(User).filter(User.email == "h1@x.com").first()
        assert s.query(Host).filter(Host.user_id == u.id).first() is not None
    finally:
        s.close()


def test_registration_rejects_duplicate_email(client):
    client.post("/api/auth/register", json={"email": "dup@x.com", "password": "password123"})
    r = client.post("/api/auth/register", json={"email": "dup@x.com", "password": "password123"})
    assert r.status_code == 409


def test_registration_requires_email_and_password(client):
    r1 = client.post("/api/auth/register", json={"password": "password123"})
    assert r1.status_code == 400
    r2 = client.post("/api/auth/register", json={"email": "noPW@x.com"})
    assert r2.status_code == 400


def test_registration_password_min_length(client):
    r = client.post("/api/auth/register", json={"email": "short@x.com", "password": "abc"})
    assert r.status_code == 400


def test_registration_returns_jwt_token(client):
    r = client.post("/api/auth/register", json={"email": "tok@x.com", "password": "password123"})
    assert r.status_code == 200
    token = r.json()["token"]
    decoded = decode_token(token)
    assert decoded["email"] == "tok@x.com"


def test_login_returns_jwt_token(client):
    client.post("/api/auth/register", json={"email": "li@x.com", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "li@x.com", "password": "password123"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_rejects_invalid_password(client):
    client.post("/api/auth/register", json={"email": "li2@x.com", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "li2@x.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_rejects_nonexistent_email(client):
    r = client.post("/api/auth/login", json={"email": "noexist@x.com", "password": "password123"})
    assert r.status_code == 401


def test_login_token_has_expiry(client):
    client.post("/api/auth/register", json={"email": "exp@x.com", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "exp@x.com", "password": "password123"})
    token = r.json()["token"]
    decoded = decode_token(token)
    assert "exp" in decoded
    delta = decoded["exp"] - decoded["iat"]
    assert 23 * 3600 <= delta <= 25 * 3600


def test_protected_endpoint_rejects_missing_token(client):
    r = client.get("/api/host/listings")
    assert r.status_code == 401


def test_protected_endpoint_rejects_expired_token(client):
    expired = create_token(1, "x@x.com", "host", expires_hours=-1)
    r = client.get("/api/host/listings", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_protected_endpoint_rejects_invalid_token(client):
    r = client.get("/api/host/listings", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert r.status_code == 401


def test_protected_endpoint_succeeds_with_valid_token(client, host_user):
    r = client.get("/api/host/listings", headers=host_user["headers"])
    assert r.status_code == 200
