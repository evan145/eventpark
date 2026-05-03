# Public Beta Deploy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy EventPark as a free-tier public beta on Render + Neon Postgres + Vercel, with a 15-test post-deploy smoke gate, manual exploratory checklist, and weekly security checklist.

**Architecture:** FastAPI backend on Render free, Neon Postgres free, Vite/React SPA on Vercel free. Stripe and outbound email remain mocked (minimum-realism beta). The same FastAPI app keeps SQLite for local dev/tests via env-driven `DATABASE_URL`. UptimeRobot keeps Render warm and alerts on outage.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, psycopg3, Vite 5, React 18, TypeScript, pytest, Vitest, Render, Neon, Vercel, UptimeRobot.

**Spec:** `docs/superpowers/specs/2026-05-02-public-beta-deploy-design.md`

**Workflow:** Each Chunk 1–3 task is TDD: write a failing test, see it fail, implement, see it pass, commit. Chunks 4–5 are procedural (manual ops + content writing, no tests). Run the existing test suites (`pytest tests/ -v` and `cd web && npm run test:run`) at the end of each chunk to confirm no regressions.

---

## Chunk 1: Backend code changes

Three changes to the backend, each gated by a new test that exercises only that change. The existing 146 pytest tests must still pass at the end of the chunk.

### Task 1.1: Initialize the git repo and add .gitignore

**Files:**
- Create: `.gitignore`

The project isn't a git repo yet (`Is a git repository: false` in our environment). Initialize it before any other work so subsequent tasks can commit.

- [ ] **Step 1: Create `.gitignore`**

```gitignore
# Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
.pytest_cache/
.coverage
htmlcov/
.mypy_cache/
.ruff_cache/

# Virtual envs
.venv/
venv/
env/

# Local databases
*.db
*.db-journal

# Node / Vite
node_modules/
web/dist/
web/.vite/

# Playwright
playwright-report/
test-results/

# IDE / OS
.DS_Store
.vscode/
.idea/

# Local env files
.env
.env.local
.env.*.local
```

- [ ] **Step 2: Initialize repo, stage everything, commit**

```bash
cd "/Users/evanj.blonien/PARKING PROJECT"
git init -b main
git add .gitignore
git commit -m "chore: add .gitignore"
git add .
git commit -m "chore: initial commit (backend + frontend MVP, specs)"
```

Expected: two commits on `main`. `git status` shows clean.

- [ ] **Step 3: Verify the eventpark.db is excluded**

Run: `git ls-files | grep -E '\.db$|node_modules|__pycache__' || echo "OK"`
Expected: `OK` printed (i.e., no matches).

---

### Task 1.2: Add psycopg dependency

**Files:**
- Modify: `pyproject.toml`

We need a Postgres driver bundled. `psycopg[binary]>=3.1` is the modern, SQLAlchemy-2-friendly choice; the `[binary]` extra avoids native build steps on Render.

- [ ] **Step 1: Read the current `[project]` dependencies block**

Run: `cat pyproject.toml`
Confirm there is a dependencies array. If `psycopg` already exists, skip this task.

- [ ] **Step 2: Add `psycopg[binary]>=3.1` to the `dependencies` list**

Edit `pyproject.toml`. Example diff:
```diff
 dependencies = [
   "fastapi>=0.110",
   "uvicorn[standard]>=0.27",
   "sqlalchemy>=2.0",
+  "psycopg[binary]>=3.1",
   ...
 ]
```

- [ ] **Step 3: Reinstall to pick up the new dep**

Run: `pip install -e .`
Expected: `psycopg` shown in output, exit 0.

- [ ] **Step 4: Verify importable**

Run: `python -c "import psycopg; print(psycopg.__version__)"`
Expected: a 3.x version printed.

- [ ] **Step 5: Run the full backend suite to confirm nothing regressed**

Run: `pytest tests/ -v 2>&1 | tail -5`
Expected: `146 passed`.

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml
git commit -m "chore: add psycopg[binary] dependency"
```

---

### Task 1.3: Normalize Postgres URL scheme in config

**Files:**
- Modify: `app/config.py`
- Test: `tests/test_config.py` (new)

Neon hands out `postgres://` URLs which SQLAlchemy 2 rejects. We rewrite to `postgresql+psycopg://`. Local SQLite dev path stays untouched.

- [ ] **Step 1: Read `app/config.py` to see the current `DATABASE_URL` handling**

Run: `cat app/config.py`
Confirm there's a single `DATABASE_URL` env-var read. Note the line number.

- [ ] **Step 2: Write the failing test at `tests/test_config.py`**

```python
import importlib
import os

import pytest

import app.config as config_mod


def _reload(monkeypatch, **env):
    for k, v in env.items():
        if v is None:
            monkeypatch.delenv(k, raising=False)
        else:
            monkeypatch.setenv(k, v)
    return importlib.reload(config_mod)


def test_sqlite_url_passes_through(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="sqlite:///./eventpark.db")
    assert m.settings.DATABASE_URL == "sqlite:///./eventpark.db"


def test_neon_postgres_scheme_normalized(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgres://u:p@host/db?sslmode=require")
    assert m.settings.DATABASE_URL == "postgresql+psycopg://u:p@host/db?sslmode=require"


def test_postgresql_scheme_gets_psycopg_driver(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgresql://u:p@host/db")
    assert m.settings.DATABASE_URL == "postgresql+psycopg://u:p@host/db"


def test_postgresql_with_existing_driver_left_alone(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL="postgresql+asyncpg://u:p@host/db")
    assert m.settings.DATABASE_URL == "postgresql+asyncpg://u:p@host/db"


def test_default_when_unset(monkeypatch):
    m = _reload(monkeypatch, DATABASE_URL=None)
    assert m.settings.DATABASE_URL.startswith("sqlite:///")
```

- [ ] **Step 3: Run the test, confirm it fails**

Run: `pytest tests/test_config.py -v`
Expected: at least 2 failures (`test_neon_postgres_scheme_normalized`, `test_postgresql_scheme_gets_psycopg_driver`).

- [ ] **Step 4: Implement the normalization**

Edit `app/config.py`. Add a helper function and call it where `DATABASE_URL` is read:

```python
def _normalize_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url
```

Then in the `Settings` class (or wherever `DATABASE_URL` is assigned):
```python
DATABASE_URL: str = _normalize_db_url(
    os.environ.get("DATABASE_URL", "sqlite:///./eventpark.db")
)
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `pytest tests/test_config.py -v`
Expected: 5 passed.

- [ ] **Step 6: Run the full backend suite**

Run: `pytest tests/ -v 2>&1 | tail -5`
Expected: `151 passed` (146 existing + 5 new).

- [ ] **Step 7: Commit**

```bash
git add app/config.py tests/test_config.py
git commit -m "feat(config): normalize Postgres URL scheme for psycopg3"
```

---

### Task 1.4: Add CORS middleware

**Files:**
- Modify: `app/config.py` — add `ALLOWED_ORIGINS` setting
- Modify: `app/main.py` — wire `CORSMiddleware`
- Test: `tests/test_cors.py` (new)

Required so the Vercel SPA can call the Render API.

- [ ] **Step 1: Write the failing test at `tests/test_cors.py`**

```python
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
    # Either 400 or 200 with no allow-origin header — never echoes the evil origin.
    assert r.headers.get("access-control-allow-origin") != "https://evil.example"


def test_cors_get_response_includes_allow_origin_for_listed(client_with_cors):
    r = client_with_cors.get(
        "/api/events",
        headers={"Origin": "https://eventpark.vercel.app"},
    )
    assert r.headers.get("access-control-allow-origin") == "https://eventpark.vercel.app"
```

- [ ] **Step 2: Run, confirm fail**

Run: `pytest tests/test_cors.py -v`
Expected: failures (no CORS header in response).

- [ ] **Step 3: Add `ALLOWED_ORIGINS` to `app/config.py`**

```python
ALLOWED_ORIGINS: list[str] = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]
```

- [ ] **Step 4: Wire `CORSMiddleware` in `app/main.py`**

At the top:
```python
from fastapi.middleware.cors import CORSMiddleware
```

Inside `create_app()`, **before** the rate-limit middleware (CORS must run first so preflights aren't rate-limited away):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 5: Run the test, confirm it passes**

Run: `pytest tests/test_cors.py -v`
Expected: 3 passed.

- [ ] **Step 6: Run the full backend suite**

Run: `pytest tests/ -v 2>&1 | tail -5`
Expected: `154 passed` (151 + 3).

- [ ] **Step 7: Commit**

```bash
git add app/config.py app/main.py tests/test_cors.py
git commit -m "feat(api): add CORS middleware driven by ALLOWED_ORIGINS"
```

---

### Task 1.5: Add `/health` endpoint

**Files:**
- Modify: `app/routers/pages.py`
- Modify: `tests/test_pages.py`

Render's healthcheck and UptimeRobot both ping this. Must be exempt from rate limiting (it already is — the rate limiter only matches `/api/*`).

- [ ] **Step 1: Add a failing test to `tests/test_pages.py`**

Append:
```python
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
```

(Use whatever `client` fixture pattern the existing `tests/test_pages.py` uses; copy from a sibling test.)

- [ ] **Step 2: Run, confirm fail**

Run: `pytest tests/test_pages.py -v`
Expected: 2 failures (404 on `/health`).

- [ ] **Step 3: Add the route in `app/routers/pages.py`**

```python
@router.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pytest tests/test_pages.py -v`
Expected: 9 passed (7 existing + 2 new).

- [ ] **Step 5: Run the full backend suite**

Run: `pytest tests/ -v 2>&1 | tail -5`
Expected: `156 passed` (154 + 2).

- [ ] **Step 6: Commit**

```bash
git add app/routers/pages.py tests/test_pages.py
git commit -m "feat(api): add /health endpoint for Render + UptimeRobot"
```

---

**Chunk 1 acceptance:** `pytest tests/ -v` reports 156 passed. Three new commits on `main`.

---

## Chunk 2: Frontend code changes + repo config files

One frontend code change (payment bypass) plus four config files. The 48 vitest tests must still pass at the end.

### Task 2.1: Frontend payment-bypass conditional

**Files:**
- Modify: `web/src/components/booking/Step3Payment.tsx`
- Modify: `web/tests/component/booking.test.tsx` — add bypass test
- Create: `web/.env.local` (local dev — sets `VITE_PAYMENTS_ENABLED=true` so existing tests keep using Stripe path)

The default behavior when the env var is missing or anything other than the literal `"true"` is **bypass** — fail-safe so a forgotten Vercel env var ships the bypass UI, not real Stripe.

- [ ] **Step 1: Read the current `Step3Payment.tsx`**

Run: `cat web/src/components/booking/Step3Payment.tsx`
Note the structure — there's a Stripe Elements path. Identify the entry point.

- [ ] **Step 2: Write the failing bypass test in `web/tests/component/booking.test.tsx`**

Add a new `describe` block:
```ts
describe('Step3Payment in bypass mode', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_PAYMENTS_ENABLED', 'false');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders a "Continue (beta — no payment)" button instead of Stripe', async () => {
    renderWithProviders(<BookingFlow eventListingId={1} unitPrice={20} availableSpots={4} />);
    // navigate the flow to step 3
    // (use whatever helper or click sequence the existing flow tests use)
    // ...
    expect(await screen.findByRole('button', { name: /continue.*beta/i })).toBeInTheDocument();
    expect(screen.queryByTestId('stripe-elements-card')).not.toBeInTheDocument();
  });

  it('clicking the bypass button submits the booking without Stripe', async () => {
    // same setup, click the button, assert POST /api/bookings was made by MSW handler
  });
});
```

(Adapt to the actual fixture/helper setup used in the existing `booking.test.tsx`.)

- [ ] **Step 3: Run, confirm fail**

Run: `cd web && npx vitest run tests/component/booking.test.tsx`
Expected: 2 new failures.

- [ ] **Step 4: Implement the conditional in `Step3Payment.tsx`**

Top of the component file:
```ts
const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
```

Inside the component render — add a branch:
```tsx
if (!paymentsEnabled) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Beta — no real payment will be charged.
      </p>
      <button
        type="button"
        className="btn-primary w-full"
        onClick={onConfirm}  // existing submit handler
        disabled={submitting}
      >
        Continue (beta — no payment)
      </button>
    </div>
  );
}
// ...existing Stripe Elements render below...
```

- [ ] **Step 5: Add `web/.env.local` so local dev + tests still see Stripe path**

```
VITE_PAYMENTS_ENABLED=true
```

(This file is already gitignored by `.env.local` in the root `.gitignore`.)

- [ ] **Step 6: Run, confirm pass**

Run: `cd web && npm run test:run 2>&1 | tail -5`
Expected: `50 passed` (48 existing + 2 new).

- [ ] **Step 7: Commit**

```bash
git add web/src/components/booking/Step3Payment.tsx web/tests/component/booking.test.tsx
git commit -m "feat(web): add VITE_PAYMENTS_ENABLED bypass for beta deploys"
```

---

### Task 2.2: render.yaml + runtime.txt

**Files:**
- Create: `render.yaml`
- Create: `runtime.txt`

Declarative Render service config. Lets us recreate the service from scratch by pointing Render at the repo. Render's Python runtime reads the version from a `runtime.txt` (or `PYTHON_VERSION` env var) — there is no `pythonVersion` key in the `render.yaml` schema.

- [ ] **Step 1: Create `runtime.txt`**

```
python-3.12.3
```

- [ ] **Step 2: Create `render.yaml`**

```yaml
services:
  - type: web
    name: eventpark-api
    runtime: python
    plan: free
    region: oregon
    buildCommand: pip install -e .
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
    healthCheckPath: /health
    envVars:
      - key: DATABASE_URL
        sync: false       # set manually in dashboard from Neon
      - key: JWT_SECRET
        generateValue: true
      - key: ALLOWED_ORIGINS
        sync: false       # set manually after Vercel project URL is known
      - key: RATE_LIMIT
        value: 200/minute
      - key: HTTPS_REDIRECT
        value: "false"
      - key: PYTHONUNBUFFERED
        value: "1"
```

- [ ] **Step 3: Validate with `python -c "import yaml; yaml.safe_load(open('render.yaml'))"`**

Expected: no output (parse succeeded).

- [ ] **Step 4: Commit**

```bash
git add render.yaml runtime.txt
git commit -m "chore: add render.yaml + runtime.txt for declarative deploy config"
```

---

### Task 2.3: web/vercel.json

**Files:**
- Create: `web/vercel.json`

SPA fallback so `/events/123` doesn't 404 on a hard refresh.

- [ ] **Step 1: Create `web/vercel.json`**

```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

The negative lookahead `(?!assets/)` excludes the hashed bundle paths (`/assets/index-*.js`, `/assets/index-*.css`) from the SPA fallback so they continue to resolve to the real static files. Without it, a broad `/(.*)` rewrite can match the bundle path and serve `index.html` as JS, breaking the app.

- [ ] **Step 2: Validate JSON**

Run: `python -c "import json; json.load(open('web/vercel.json'))"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add web/vercel.json
git commit -m "chore: add vercel.json with SPA rewrite"
```

---

### Task 2.4: .env.example files

**Files:**
- Create: `.env.example`
- Create: `web/.env.example`

Documentation for future contributors / future-you.

- [ ] **Step 1: Create `.env.example` (root)**

```
# Backend env vars. Copy to .env for local overrides.

# Database. SQLite for local dev; postgres://... or postgresql://... for production.
# The app normalizes both to postgresql+psycopg://...
DATABASE_URL=sqlite:///./eventpark.db

# JWT signing secret. MUST be set to a strong random value in production.
# In dev, defaults to "dev-secret-change-me" — that default will be rejected
# by the deploy smoke test test_jwt_secret_is_not_dev_default.
JWT_SECRET=dev-secret-change-me

# Comma-separated list of origins allowed by CORS. Empty disables CORS.
# Example for production: https://eventpark.vercel.app
ALLOWED_ORIGINS=

# Rate limit per client IP per window. Format: "<count>/<unit>".
# Units: second | minute | hour | day. Default 100/minute.
RATE_LIMIT=100/minute

# When "true", install HTTPSRedirectMiddleware. Leave "false" on Render
# (its edge already handles HTTPS redirect).
HTTPS_REDIRECT=false
```

- [ ] **Step 2: Create `web/.env.example`**

```
# Frontend env vars. Copy to .env.local for local dev.

# URL of the EventPark API. Local dev:
VITE_API_URL=http://localhost:8000

# When literally "true", show the Stripe Elements payment UI.
# Anything else (including missing) → bypass UI ("Continue (beta — no payment)").
# Set to "true" in .env.local for the existing component tests to stay green.
VITE_PAYMENTS_ENABLED=true
```

- [ ] **Step 3: Commit both**

```bash
git add .env.example web/.env.example
git commit -m "docs: add .env.example for backend and frontend"
```

---

**Chunk 2 acceptance:**
- `cd web && npm run test:run` → 50 passed.
- `pytest tests/ -v` → 156 passed (no regression).
- 5 new commits on `main`.

---

## Chunk 3: Layer 2 — post-deploy smoke test suite

Build the 15 smoke tests that gate every deploy. They run against the live deployment via two env vars (`BASE_URL` for the Render API host, `WEB_URL` for the Vercel SPA host). They are NOT run by the default `pytest tests/` invocation — they live in `tests/deploy/` and are invoked separately.

### Task 3.1: Set up the deploy-tests package

**Files:**
- Create: `tests/deploy/__init__.py`
- Create: `tests/deploy/conftest.py`
- Modify: `pyproject.toml` — add a `[tool.pytest.ini_options]` `markers` entry for `deploy`

- [ ] **Step 1: Create `tests/deploy/__init__.py`**

Empty file.

- [ ] **Step 2: Create `tests/deploy/conftest.py`**

```python
"""Fixtures for live-deploy smoke tests.

Run with:
    BASE_URL=https://eventpark-api.onrender.com \\
    WEB_URL=https://eventpark.vercel.app \\
    pytest tests/deploy -v -m deploy
"""
import os
import pytest
import httpx


def _require(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        pytest.skip(f"{name} not set; live-deploy tests skipped")
    return val.rstrip("/")


@pytest.fixture(scope="session")
def base_url() -> str:
    return _require("BASE_URL")


@pytest.fixture(scope="session")
def web_url() -> str:
    return _require("WEB_URL")


@pytest.fixture(scope="session")
def api(base_url: str):
    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        yield client


@pytest.fixture(scope="session")
def web(web_url: str):
    with httpx.Client(base_url=web_url, timeout=30.0) as client:
        yield client
```

- [ ] **Step 3: Add the `deploy` pytest marker so unmarked runs skip these tests**

First, check whether `pyproject.toml` already has a `[tool.pytest.ini_options]` block:

```bash
grep -A 20 'tool.pytest.ini_options' pyproject.toml || echo "no block yet"
```

If `--strict-markers` or `addopts = "--strict-markers"` is present, the marker MUST be registered before any test uses it or pytest will error on collection. Either way, add (or extend) the block:

```toml
[tool.pytest.ini_options]
markers = [
    "deploy: live-deploy smoke tests; require BASE_URL and WEB_URL env vars",
]
```

If the existing block has other entries, merge — do not replace.

- [ ] **Step 4: Confirm regular test run does not pick up `tests/deploy/` accidentally**

Run: `pytest tests/ -v -m "not deploy" 2>&1 | tail -5`
Expected: `156 passed`. (At this point `tests/deploy/` is empty so nothing collected anyway, but the marker pattern is now in place.)

- [ ] **Step 5: Commit**

```bash
git add tests/deploy/__init__.py tests/deploy/conftest.py pyproject.toml
git commit -m "test(deploy): scaffold tests/deploy package with marker + fixtures"
```

---

### Task 3.2: Write the 15 smoke tests

**Files:**
- Create: `tests/deploy/test_live.py`

All 15 tests in one file. Each is independently runnable. Marked `@pytest.mark.deploy`. Use the fixtures from `conftest.py`.

- [ ] **Step 0: Verify selector assumptions for test 14b before writing it**

Test 14b drives the real booking flow with Playwright. Before pasting the code in Step 1, open the actual booking components and confirm the selectors match:

```bash
ls web/src/components/booking/
grep -nE 'aria-label|<label|name=|getByLabel' web/src/components/booking/Step1*.tsx web/src/components/booking/Step2*.tsx web/src/components/booking/Step3Payment.tsx
```

Confirm:
- Step 1 has labeled inputs matching `/name/i`, `/email/i`, `/phone/i` (or note the actual labels and edit the test).
- The button advancing each step has accessible text matching `/next|continue/i` (or note the actual text — e.g. "Confirm", "Reserve" — and edit).
- Step 3's bypass button matches `/continue.*beta/i` (this is the literal string from Task 2.1; should be safe).

If any selector won't match, edit the regexes in 14b accordingly before running.

- [ ] **Step 1: Create `tests/deploy/test_live.py` with all 15 tests**

```python
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
    # When VITE_PAYMENTS_ENABLED !== "true", Vite's dead-code elimination
    # should drop the @stripe/stripe-js import. Confirm by greping the bundle
    # for the loader URL the Stripe SDK fetches at init time.
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
def test_bypass_copy_renders_in_step3(web_url):
    # Use Playwright (already a dev dep) to actually drive the booking flow to
    # step 3 and assert the bypass button is present. This proves the conditional
    # branch ships, not just that the Stripe string is absent.
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"{web_url}/")
        # Open the seeded event and start booking the first available spot.
        # "Camp Randall" matches the seeded venue (see test 9 + seed.py); safer
        # than the event name, which could change.
        page.get_by_text(re.compile("Camp Randall", re.I)).first.click()
        page.get_by_role("button", name=re.compile("book|reserve", re.I)).first.click()
        # Step 1 form
        page.get_by_label(re.compile("name", re.I)).fill("Smoke Tester")
        page.get_by_label(re.compile("email", re.I)).fill(
            f"smoke-{int(time.time())}@eventpark.test"
        )
        page.get_by_label(re.compile("phone", re.I)).fill("608-555-0000")
        page.get_by_role("button", name=re.compile("next|continue", re.I)).click()
        # Step 2 → Step 3
        page.get_by_role("button", name=re.compile("next|continue", re.I)).click()
        # Step 3: bypass mode should render the beta button, NOT a Stripe iframe.
        bypass_btn = page.get_by_role("button", name=re.compile("continue.*beta", re.I))
        bypass_btn.wait_for(timeout=10_000)
        assert bypass_btn.is_visible()
        assert page.locator("iframe[name^='__privateStripeFrame']").count() == 0
        browser.close()
```

- [ ] **Step 2: Add `pyjwt` and `playwright` to test dependencies**

If not already present in `pyproject.toml`, add to the dev dependencies:
```toml
[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "httpx>=0.27",
    "pyjwt>=2.8",
    "playwright>=1.44",
]
```

Then:
```bash
pip install -e ".[dev]"
playwright install chromium  # one-time browser download (~150MB)
```

- [ ] **Step 3: Confirm tests collect (without running, since BASE_URL/WEB_URL aren't set yet)**

Run: `pytest tests/deploy/test_live.py --collect-only`
Expected: 15 tests listed.

- [ ] **Step 4: Confirm `pytest tests/` still ignores them (skip cleanly)**

Run: `pytest tests/deploy/ -v 2>&1 | tail -10`
Expected: 15 skipped (because `BASE_URL` is unset).

- [ ] **Step 5: Confirm the standard suite is unaffected**

Run: `pytest tests/ -v --ignore=tests/deploy -m "not deploy" 2>&1 | tail -3`
Expected: `156 passed`.

- [ ] **Step 6: Commit**

```bash
git add tests/deploy/test_live.py pyproject.toml
git commit -m "test(deploy): add 15-test post-deploy smoke gate"
```

---

**Chunk 3 acceptance:**
- `pytest tests/deploy/test_live.py --collect-only` lists 15 tests.
- Standard suite reports 156 passed unchanged.
- Two new commits on `main`.

---

## Chunk 4: Manual checklists (Layers 4 + 5)

Two markdown files. No tests, no commits-in-the-middle — write, commit, done.

### Task 4.1: Manual exploratory checklist

**Files:**
- Create: `tests/deploy/manual_checklist.md`

- [ ] **Step 1: Create the file**

```markdown
# EventPark Public-Beta Manual Test Checklist

Run after every deploy. Failures here become GitHub issues, not deploy blockers.

Use the seeded test accounts (all password `password123`):
- Admin: `admin@eventpark.test`
- Host:  `host@eventpark.test`
- Guest: `guest@eventpark.test`

URLs:
- App:  https://<vercel-project>.vercel.app
- API:  https://eventpark-api.onrender.com (only useful for direct curling)

## Anonymous flow

- [ ] Open the app URL on a phone — landing page renders, no console errors
- [ ] Search for "Camp Randall", land on event page, see at least one seeded spot
- [ ] Try to book without filling required fields — inline errors appear, no crash

## Guest flow

- [ ] Log in as `guest@eventpark.test`
- [ ] Book the seeded spot — confirmation code appears (format `EP-YYYYMMDD-XXXX`)
- [ ] Open the booking detail URL (`/bookings/:id`) on a different device — same content
- [ ] Cancel the booking >48h before event — status flips to "cancelled"

## Host flow

- [ ] Log in as `host@eventpark.test`
- [ ] /host/dashboard shows the seeded listing and any guest-flow bookings from above
- [ ] Create a new listing via /host/listings/new — appears with "Pending" badge

## Admin flow

- [ ] Log in as `admin@eventpark.test`
- [ ] /admin shows the new pending listing from the host flow
- [ ] Approve it — status changes to "approved"
- [ ] Create a new event for next month via /admin
- [ ] Log out, log back in as guest, search for the new event — appears

## Cross-cutting

- [ ] Resize browser to 375px width — no horizontal scroll on any page
- [ ] Hard-refresh on `/events/:id` — same content (SPA fallback works)
- [ ] Hard-refresh on `/host/dashboard` while logged in — stays logged in
- [ ] Log out — `/host/dashboard` redirects to `/login`
- [ ] Network throttle to "Slow 3G" in devtools, reload — page is usable, not blank
```

- [ ] **Step 2: Commit**

```bash
git add tests/deploy/manual_checklist.md
git commit -m "docs(deploy): add manual exploratory checklist"
```

---

### Task 4.2: Security checklist

**Files:**
- Create: `tests/deploy/security_checklist.md`

- [ ] **Step 1: Create the file**

```markdown
# EventPark Security Smoke Checklist

Run weekly, or after any middleware/auth/config change.

## TLS / headers

- [ ] `curl -I https://eventpark-api.onrender.com/health | grep -i strict-transport` — HSTS present
- [ ] `curl -I https://<vercel>.vercel.app/ | grep -i strict-transport` — HSTS present
- [ ] HTTP plain redirects to HTTPS for both hosts (`curl -I http://...`)

## Auth gating

- [ ] `GET /api/host/listings` without Authorization header → 401
- [ ] `GET /api/admin/listings` with a guest JWT → 403
- [ ] Bogus JWT (e.g. `Authorization: Bearer foo.bar.baz`) → 401
- [ ] Layer 2 test 13 still passes (JWT secret is not the dev default)

## Secrets

- [ ] Search the deployed Vercel JS bundle for "supabase", "neon", "JWT_SECRET",
      or any obvious secret pattern: `curl https://<vercel>/assets/index-*.js | grep -iE 'secret|password|neon|JWT'`
      — should match nothing
- [ ] Check Render env-var page: no plaintext production secrets shown to non-admins
- [ ] No `.env` file is in the GitHub repo (`git ls-files | grep -E '^\.env$'` → empty)

## Rate limiter

- [ ] `for i in $(seq 1 250); do curl -s -o /dev/null -w "%{http_code}\n" https://eventpark-api.onrender.com/api/events; done | sort | uniq -c`
      — at least some 429s appear (proves limiter is wired). Run during off-hours.

## Source maps

- [ ] `curl -I https://<vercel>/assets/index-*.js.map` — 404 (source maps not exposed)

## CORS

- [ ] Preflight from random origin to `/api/events` does not echo the origin in `Access-Control-Allow-Origin`
- [ ] Preflight from the configured Vercel origin does echo it
```

- [ ] **Step 2: Commit**

```bash
git add tests/deploy/security_checklist.md
git commit -m "docs(deploy): add weekly security smoke checklist"
```

---

**Chunk 4 acceptance:** two new markdown files committed. No tests broken (none should have been touched).

---

## Chunk 5: Deploy procedure (manual ops, no code)

This chunk is procedural. Each task is something **you** do in a browser or terminal — there's no code to write or test. Tick each box as you go. Tasks are sequenced so each step has the inputs from the previous.

### Task 5.1: Push to GitHub

- [ ] **Step 1: Create a GitHub repo** named `eventpark` via the GitHub UI. Don't initialize with a README — we already have commits.

  **Public vs private:** Vercel's free Hobby tier deploys from public repos with no friction. Private repos work too but require a connected GitHub account on the same login and can hit Hobby-tier limits sooner. If you don't mind the code being public for the beta, choose **Public** — it sidesteps both issues. Otherwise choose **Private** and accept that you may need to upgrade Vercel later.

- [ ] **Step 2: Add the remote and push**

```bash
cd "/Users/evanj.blonien/PARKING PROJECT"
git remote add origin git@github.com:<your-username>/eventpark.git
git push -u origin main
```

- [ ] **Step 3: Confirm in the GitHub UI** that all your commits from Chunks 1–4 are visible.

---

### Task 5.2: Provision Neon Postgres

- [ ] **Step 1: Sign up at https://neon.tech** with GitHub OAuth.
- [ ] **Step 2: Create a project** named `eventpark`. Region: any close to you. Plan: free.
- [ ] **Step 3: Copy the connection string** from the dashboard. It looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/eventpark?sslmode=require`. Save it somewhere safe — you'll paste it into Render in 5.4.

---

### Task 5.3: Claim the Vercel project name

- [ ] **Step 1: Sign up at https://vercel.com** with GitHub OAuth.
- [ ] **Step 2: New Project → Import Git Repository → select your `eventpark` repo.**
- [ ] **Step 3: In the Configure Project screen, set Root Directory = `web/`**. Vercel auto-detects Vite.
- [ ] **Step 4: Note the project name Vercel picked** (probably `eventpark`). The URL will be `https://eventpark-<hash>.vercel.app` or `https://eventpark.vercel.app` if the name was free.
- [ ] **Step 5: Don't deploy yet — Vercel will build with empty env vars and show errors. Either skip the initial deploy or let it deploy a broken build; we'll fix env vars in 5.6 and redeploy.**

Output: the exact Vercel URL, e.g. `https://eventpark-abc123.vercel.app`.

---

### Task 5.4: Provision Render backend

- [ ] **Step 1: Sign up at https://render.com** with GitHub OAuth.
- [ ] **Step 2: New Web Service → connect the `eventpark` repo.** Render reads `render.yaml` and pre-fills runtime, build cmd, start cmd, health check.
- [ ] **Step 3: Set the two env vars Render needs you to fill in manually:**

| Key | Value |
|---|---|
| `DATABASE_URL` | The Neon string from 5.2 |
| `ALLOWED_ORIGINS` | The Vercel URL from 5.3 (e.g. `https://eventpark-abc123.vercel.app`) |

`render.yaml` already declares `JWT_SECRET` with `generateValue: true` (Render auto-generates a strong random value on first deploy — do not override). `RATE_LIMIT`, `HTTPS_REDIRECT`, and `PYTHONUNBUFFERED` are also declared in `render.yaml`. Confirm all five appear in the Environment tab after the service is created.

- [ ] **Step 4: Click "Create Web Service".** First build runs ~3–5 min. Watch the log for errors.

- [ ] **Step 5: Note the service URL**, e.g. `https://eventpark-api.onrender.com`.

- [ ] **Step 6: Curl the health endpoint to confirm boot**

```bash
curl https://eventpark-api.onrender.com/health
# Expected: {"status":"ok"}
```

If you get a 502 or timeout, check Render's deploy log. The most common failure: `psycopg` import error (means `pyproject.toml` change didn't reach the deploy — push again).

---

### Task 5.5: Seed the production database

- [ ] **Step 1: In the Render dashboard for the web service, open the Shell tab.**
- [ ] **Step 2: Run the seed**

```bash
python seed.py
```

Expected output:
```
Seed complete.
  Admin: admin@eventpark.test  /  password123
  Host:  host@eventpark.test  /  password123
  Guest: guest@eventpark.test  /  password123
  Events: 2 created/found
  Listing id=1 (approved) linked to all events
```

If you see `(trapped) error reading bcrypt version`, ignore it — the same warning appeared locally; passwords still hash correctly.

- [ ] **Step 3: Verify via curl**

```bash
curl -X POST https://eventpark-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eventpark.test","password":"password123"}'
# Expected: {"token":"eyJ...","user":{"id":1,"email":"admin@eventpark.test","role":"admin",...}}
```

---

### Task 5.6: Configure Vercel env and deploy frontend

- [ ] **Step 1: In the Vercel project's Settings → Environment Variables, set:**

| Key | Value |
|---|---|
| `VITE_API_URL` | The Render URL from 5.4 (e.g. `https://eventpark-api.onrender.com`) |
| `VITE_PAYMENTS_ENABLED` | `false` |

Apply to: Production, Preview, Development.

- [ ] **Step 2: Trigger a new deploy** via Deployments → "..." → Redeploy. ~2 min.

- [ ] **Step 3: Open the Vercel URL in a browser** and confirm the EventPark landing renders. If you get CORS errors in the browser console, double-check `ALLOWED_ORIGINS` on Render exactly matches the Vercel URL (no trailing slash, no http vs https mismatch).

---

### Task 5.7: Set up UptimeRobot

- [ ] **Step 1: Sign up at https://uptimerobot.com** (no card required).

- [ ] **Step 2: Add Monitor #1 — keep Render warm**

| Field | Value |
|---|---|
| Type | HTTP(s) |
| URL | `https://eventpark-api.onrender.com/health` |
| Interval | 5 minutes |
| Name | EventPark API health |

- [ ] **Step 3: Add Monitor #2 — user-visible app**

| Field | Value |
|---|---|
| Type | Keyword |
| URL | The Vercel URL |
| Keyword | `EventPark` |
| Alert when keyword | Not exists |
| Interval | 5 minutes |

- [ ] **Step 4: Add an email alert contact** for both monitors.

---

### Task 5.8: Run the Layer 2 smoke gate

- [ ] **Step 1: From your laptop, run the 15 smoke tests against the live deployment**

```bash
cd "/Users/evanj.blonien/PARKING PROJECT"
BASE_URL=https://eventpark-api.onrender.com \
WEB_URL=https://<your-vercel-url>.vercel.app \
pytest tests/deploy/test_live.py -v -m deploy
```

Expected: `15 passed`.

- [ ] **Step 2: HARD GATE — if ANY of the 15 tests fail, ROLL BACK IMMEDIATELY.**

Per the spec (section 7), any Layer 2 failure after deploy means the deploy is unhealthy and must be reverted. Do not attempt fix-forward at this stage — the production database has live beta users on it and a half-broken deploy is worse than no deploy.

Rollback procedure:

```bash
git revert HEAD --no-edit   # or revert the specific deploy-config commit
git push                     # triggers Render + Vercel redeploys back to the prior good build
```

Re-run the 15-test gate against the rolled-back build and confirm green before doing anything else. Only AFTER the gate is green again should you diagnose the original failure on a feature branch.

(Common root causes — record these in the post-mortem, don't use them to skip the rollback:
- **Test 5/6 (CORS)**: `ALLOWED_ORIGINS` on Render doesn't exactly match the Vercel URL.
- **Test 8/9 (login/event)**: seed didn't run on Neon.
- **Test 13 (JWT secret)**: `JWT_SECRET` on Render is still the dev default.
- **Test 14a/14b (payment bypass)**: `VITE_PAYMENTS_ENABLED` on Vercel is `true` instead of `false`.)

- [ ] **Step 3: Walk the manual checklist** (`tests/deploy/manual_checklist.md`) on a real device (phone is best).

- [ ] **Step 4: Commit any post-deploy hotfixes** with messages like `fix(deploy): correct VITE_API_URL` so future-you can audit the deploy ritual.

---

### Task 5.9: Document the live URLs in the repo

**Files:**
- Modify: `README.md` (root)

- [ ] **Step 1: Add a "Live deployment" section to README**

```markdown
## Live deployment

- App: https://<your-vercel-url>.vercel.app
- API: https://eventpark-api.onrender.com
- DB:  Neon project `eventpark` (free tier)
- Monitoring: UptimeRobot

Deploy procedure: `docs/superpowers/plans/2026-05-02-public-beta-deploy.md` chunk 5.
Architecture spec: `docs/superpowers/specs/2026-05-02-public-beta-deploy-design.md`.
```

- [ ] **Step 2: Commit and push**

```bash
git add README.md
git commit -m "docs: link live deployment URLs and runbooks"
git push
```

This triggers a no-op Render rebuild (~3 min) and a Vercel rebuild (~1 min). Both should remain green.

---

**Chunk 5 acceptance:**
- The 15 smoke tests pass against live URLs.
- UptimeRobot is sending heartbeat checks every 5 min.
- The manual checklist has been walked at least once.
- The Vercel URL is the canonical user-facing app.

---

## Final acceptance

- [ ] `pytest tests/ -v -m "not deploy"` → 156 passed locally
- [ ] `cd web && npm run test:run` → 50 passed locally
- [ ] `BASE_URL=… WEB_URL=… pytest tests/deploy -v -m deploy` → 15 passed live
- [ ] UptimeRobot dashboard shows both monitors green
- [ ] Manual checklist walked once and any issues filed as GitHub issues
- [ ] README points to live URLs

When all checked, the public beta is live and the deploy ritual is repeatable: code → push → smoke → checklist.
