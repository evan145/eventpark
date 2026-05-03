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
