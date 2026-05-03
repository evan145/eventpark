import importlib
import pytest
from fastapi.testclient import TestClient

import app.main as main_mod
import app.config as config_mod


@pytest.fixture
def client_with_cors(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://eventpark.vercel.app,https://other.test")
    # Order matters: app.main imports `settings` from app.config at import time.
    # Reload config FIRST so the new env var is picked up, then reload main so
    # it re-imports the fresh settings singleton.
    importlib.reload(config_mod)
    m = importlib.reload(main_mod)
    return TestClient(m.app)


def test_cors_preflight_allows_listed_origin(client_with_cors):
    r = client_with_cors.options(
        "/api/events",
        headers={
            "Origin": "https://eventpark.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == "https://eventpark.vercel.app"


def test_cors_preflight_blocks_unlisted_origin(client_with_cors):
    r = client_with_cors.options(
        "/api/events",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in r.headers


def test_cors_get_response_includes_allow_origin_for_listed(client_with_cors):
    r = client_with_cors.get(
        "/api/events",
        headers={"Origin": "https://eventpark.vercel.app"},
    )
    assert r.headers.get("access-control-allow-origin") == "https://eventpark.vercel.app"


def test_cors_skipped_when_allowed_origins_empty(monkeypatch):
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    importlib.reload(config_mod)
    m = importlib.reload(main_mod)
    client = TestClient(m.app)
    r = client.get("/api/events", headers={"Origin": "https://anywhere.example"})
    # No CORS middleware → no allow-origin header.
    assert "access-control-allow-origin" not in r.headers
