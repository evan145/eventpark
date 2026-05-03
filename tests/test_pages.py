def test_landing_page_returns_200(client):
    r = client.get("/")
    assert r.status_code == 200


def test_landing_page_has_meta_title(client):
    r = client.get("/")
    assert "<title>" in r.text
    assert "EventPark" in r.text


def test_landing_page_has_meta_description(client):
    r = client.get("/")
    assert 'name="description"' in r.text


def test_sitemap_returns_200(client):
    r = client.get("/sitemap.xml")
    assert r.status_code == 200
    assert "xml" in r.headers["content-type"]
    assert "<urlset" in r.text


def test_robots_txt_returns_200(client):
    r = client.get("/robots.txt")
    assert r.status_code == 200
    assert "User-agent" in r.text


def test_api_has_rate_limiting(db_setup):
    from app.main import create_app
    from app.database import get_db
    from fastapi.testclient import TestClient
    _, TestSession = db_setup
    app = create_app(rate_limit="3/minute")

    def _get_db():
        s = TestSession()
        try:
            yield s
        finally:
            s.close()

    app.dependency_overrides[get_db] = _get_db
    c = TestClient(app)
    statuses = [c.get("/api/events").status_code for _ in range(6)]
    assert 429 in statuses


def test_https_redirect(db_setup):
    from app.main import create_app
    from fastapi.testclient import TestClient
    app = create_app(rate_limit="10000/minute", https_redirect=True)
    c = TestClient(app)
    r = c.get("/", follow_redirects=False)
    assert r.status_code in (301, 307, 308)


def test_health_endpoint_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_endpoint_not_rate_limited(monkeypatch):
    # Prove /health is exempt by first exhausting the limit on /api/*, THEN
    # confirming /health still returns 200. The rate limiter only matches
    # paths starting with /api/, so /health bypasses it by design.
    import importlib
    import app.config as config_mod
    import app.main as main_mod
    monkeypatch.setenv("RATE_LIMIT", "2/minute")
    importlib.reload(config_mod)  # reload config first; main imports settings from it
    m = importlib.reload(main_mod)
    from fastapi.testclient import TestClient
    c = TestClient(m.app)

    # Exhaust the /api/* limit — at least one request should be 429.
    api_codes = [c.get("/api/events").status_code for _ in range(10)]
    assert 429 in api_codes, f"rate limiter did not engage on /api/*: {api_codes}"

    # /health must still be 200 even after the limit is exhausted.
    for _ in range(10):
        r = c.get("/health")
        assert r.status_code == 200
