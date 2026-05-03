# EventPark — Public Beta Deployment Design

**Date:** 2026-05-02
**Status:** Approved (sections 1–4) — v2 after spec review
**Audience:** Public beta with real users, no real money. Free-tier hosting. Minimum-realism booking experience (no Stripe UI, no outbound email).

---

## 1. Goals & Non-Goals

**Goals**
- Make EventPark accessible at a public URL so testers can use it from any device.
- Preserve all existing functionality and the full booking flow up to but not including Stripe.
- Cost: $0/month, no credit card required.
- Resilient enough to leave running for several months unattended.
- A clear deploy-and-test rhythm: code change → push → smoke tests → manual checklist.

**Non-goals (deferred until later phase)**
- Real Stripe Connect / real money movement.
- Real outbound email (Resend / SendGrid).
- Custom domain.
- Database migrations (Alembic).
- Database backups beyond Neon's automatic snapshots.
- Staging / preview environments.
- CI/CD pipeline beyond the manual gate.

---

## 2. Topology

```
[ user browser ]
       │ HTTPS
       ▼
[ <project>.vercel.app ]                ← Vercel free: static React build
       │ fetch(VITE_API_URL)
       ▼
[ eventpark-api.onrender.com ]          ← Render free: FastAPI web service
       │ psycopg + DATABASE_URL
       ▼
[ Neon Postgres (free) ]
```

Plus:
- **UptimeRobot (free)** pinging `/health` every 5 min to keep Render warm and alert on outages.
- **GitHub repo** as source of truth; both Render and Vercel deploy on push to `main`.

Auto-generated subdomains (`*.onrender.com`, `*.vercel.app`) are used. No custom domain in scope.

The Render backend also serves a small Jinja landing page at `/` (used by `tests/test_pages.py`). End users land on the Vercel React SPA, never on Render's Jinja page directly. The two coexist and each has its own purpose: Render's `/` is a sanity-check + SEO surface for the API host; Vercel's `/` is the user product.

---

## 3. Code Changes

Six discrete changes are required. Everything else stays as-is.

### 3.1 Postgres support (backend)

- Add `psycopg[binary]>=3.1` to `pyproject.toml`.
- **Normalize the connection-string scheme.** Neon hands out URLs starting with either `postgres://` or `postgresql://`. SQLAlchemy 2.x rejects `postgres://`, and we want to pin the psycopg3 driver explicitly. Add to `app/config.py`:
  ```python
  url = os.environ.get("DATABASE_URL", "sqlite:///./eventpark.db")
  if url.startswith("postgres://"):
      url = "postgresql+psycopg://" + url[len("postgres://"):]
  elif url.startswith("postgresql://") and "+" not in url.split("://", 1)[0]:
      url = "postgresql+psycopg://" + url[len("postgresql://"):]
  ```
- **Schema bootstrap is already wired.** `app/main.py:36` calls `Base.metadata.create_all(bind=engine)` inside `create_app()`, which runs at module import. No new startup hook is needed; first deploy on a fresh Neon DB will create all tables. (Earlier draft of this spec was wrong about this — `create_all` is already there.)
- **FK enforcement.** Postgres enforces foreign keys natively, so no SQLite-style PRAGMA is required. The current `app/database.py` does not set the SQLite `PRAGMA foreign_keys=ON` either — local SQLite tests run without FK enforcement and still pass, which is acceptable for beta. (Earlier draft was wrong about a conditional FK pragma; there is none. No change required for Postgres.)

### 3.2 CORS middleware (backend)

Add `CORSMiddleware` reading from a new `ALLOWED_ORIGINS` env var (comma-separated). Without this, the Vercel frontend cannot call the Render backend due to browser same-origin policy.

```python
allowed = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
```

### 3.3 Health endpoint (backend)

Add `GET /health` returning `{"status":"ok"}` in `app/routers/pages.py`.

**Rate-limiter exemption is automatic.** The middleware in `app/main.py:42-54` only applies to paths starting with `/api/`. `/health` is outside that prefix, so it is exempt without any code change. (Earlier draft was wrong about an "exempt list" — the middleware is path-prefix-scoped, not list-based.)

### 3.4 Proxy headers (deployment config — no code change)

Render terminates HTTPS at its edge. Uvicorn must start with:
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
```
This installs Starlette's `ProxyHeadersMiddleware`, which rewrites `request.client.host` from `X-Forwarded-For` and `request.url.scheme` from `X-Forwarded-Proto`. Both are needed:
- `request.client.host` — used by the rate limiter at `app/main.py:45` (otherwise every request appears to come from Render's edge IP and the limiter rate-limits all users as one).
- `request.url.scheme` — used by `HTTPSRedirectMiddleware` if enabled (see 3.4.1).

#### 3.4.1 HTTPS redirect: leave disabled

`app/config.py` has `HTTPS_REDIRECT` (default `false`); when true, `HTTPSRedirectMiddleware` is installed at `app/main.py:64-66`. **Leave this `false` on Render.** Reasons:
- Render's edge already 301s plain HTTP to HTTPS at the load balancer.
- Enabling it in the app while behind a proxy can cause redirect loops if `X-Forwarded-Proto` is misread.
- Layer 2 test `test_https_enforced` will pass via Render's edge redirect, not via the app middleware.

### 3.5 Frontend payment bypass

Add `VITE_PAYMENTS_ENABLED` env var to the frontend.

- **Default: bypass (treat anything other than the literal string `"true"` as bypass).** This is fail-safe — a forgotten env var on a future preview environment ships the bypass UI, not real Stripe Elements. The conditional is explicit:
  ```ts
  const paymentsEnabled = import.meta.env.VITE_PAYMENTS_ENABLED === "true";
  ```
- When `paymentsEnabled === false` (production beta, also missing-env): `web/src/components/booking/Step3Payment.tsx` renders a single button "Continue (beta — no payment)" that POSTs the booking directly with no Stripe interaction.
- When `paymentsEnabled === true` (local dev, all existing component tests): the existing Stripe Elements UI renders unchanged. Set `VITE_PAYMENTS_ENABLED=true` in `web/.env.local` so 48 vitest tests stay green.

### 3.6 Repo & deploy config files

New files:
- `.gitignore` — covers `eventpark.db`, `node_modules/`, `web/dist/`, `web/.vite/`, `__pycache__/`, `.venv/`, `*.egg-info/`, `.env*`, `.pytest_cache/`, `playwright-report/`, `.DS_Store`
- `render.yaml` — declarative Render service definition: build command, start command, health check path, env var declarations. Pin Python via `runtime: python-3.12` (or a `runtime.txt` with `python-3.12.x`) — without this, Render picks a default that may drift from local.
- `web/vercel.json` — single rewrite rule routing all paths to `/index.html` so the SPA's client-side routing works on hard refresh.
- `.env.example` (root) — documents `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `RATE_LIMIT`, `HTTPS_REDIRECT`.
- `web/.env.example` — documents `VITE_API_URL`, `VITE_PAYMENTS_ENABLED`.

### 3.7 Explicit non-changes

- `JWT_SECRET` already env-driven via `app/config.py`. Just set the env var on Render.
- `app/services/stripe_service.py` and `app/services/email_service.py` already mocked — they no-op without external credentials. No changes.
- All existing tests (146 pytest + 48 vitest) stay green.

---

## 4. Deploy Procedure

Executed once, in this order. Total wall-clock ~45 minutes. **Order revised to avoid CORS placeholder churn:** create the Vercel project before setting Render env vars, so `ALLOWED_ORIGINS` gets the real Vercel URL on the first try.

| # | Step | Time | Output |
|---|---|---|---|
| 0 | `git init`, add `.gitignore`, create GitHub repo, first push | 5 min | repo URL |
| 1 | Sign up at neon.tech, create project `eventpark`, copy connection string | 5 min | `DATABASE_URL` (raw Neon URL) |
| 2 | Sign up at vercel.com, import repo with root dir `web/`, **claim the project name** to fix the URL — but defer the actual deploy by leaving `VITE_API_URL` blank for now | 5 min | `<project>.vercel.app` URL known |
| 3 | Sign up at render.com, new web service from repo, set env vars (`DATABASE_URL`, `JWT_SECRET` [Render-generated], `ALLOWED_ORIGINS=<the Vercel URL from step 2>`, `RATE_LIMIT=200/minute`, `HTTPS_REDIRECT=false`), deploy | 10 min | `eventpark-api.onrender.com` |
| 4 | Render web shell → `python seed.py` (creates admin/host/guest accounts + sample event) | 2 min | seeded DB |
| 5 | Vercel: set `VITE_API_URL=<Render URL from step 3>` and `VITE_PAYMENTS_ENABLED=false`, redeploy | 5 min | live SPA |
| 6 | UptimeRobot HTTP monitor on `<Render URL>/health`, 5-min interval. Second monitor: keyword on `<Vercel URL>/`, expecting `"EventPark"` | 5 min | uptime alerts |
| 7 | Smoke-test from laptop: curl `/health`, log in as seeded admin via the Vercel URL, walk a booking | 5 min | green light |

**Why the reorder:** the v1 ordering set `ALLOWED_ORIGINS` to a placeholder Vercel URL, then went back to fix it after the real URL was known — costing one extra Render redeploy. Claiming the Vercel project name first (step 2) gives us the real URL up front.

---

## 5. Test Plan

Five layers of testing. Each catches a different class of failure.

### Layer 1 — Pre-deploy gate (existing)

Manual rule: never push to `main` if either suite is red.
- `pytest tests/ -v` (146 backend tests)
- `cd web && npm run test:run` (48 frontend tests)

### Layer 2 — Post-deploy smoke suite

New: `tests/deploy/test_live.py`. Pytest, takes `BASE_URL` (Render) and `WEB_URL` (Vercel) env vars, runs against the live deployment after every deploy. ~30 seconds.

Fourteen tests (was 13; added one for payment-bypass shipping correctness):

1. `test_health_endpoint_responds` — `GET {BASE_URL}/health` = 200, body `{"status":"ok"}`.
2. `test_landing_page_loads_on_api_host` — `GET {BASE_URL}/` = 200, contains `"EventPark"` (the Jinja sanity page).
3. `test_user_facing_landing_loads_on_vercel` — `GET {WEB_URL}/` = 200, contains `"EventPark"` and a known UI string.
4. `test_sitemap_and_robots_served` — `GET {BASE_URL}/sitemap.xml` and `/robots.txt` both 200.
5. `test_cors_allows_vercel_origin` — `OPTIONS` preflight from `Origin: {WEB_URL}` returns `Access-Control-Allow-Origin: {WEB_URL}`.
6. `test_cors_blocks_other_origins` — `OPTIONS` from a random origin returns no `Access-Control-Allow-Origin` header.
7. `test_https_enforced` — `GET http://{BASE_URL_HOST}/health` (plain HTTP) returns 301/308 to https. Passes via Render's edge redirect.
8. `test_admin_login_works` — POST `/api/auth/login` with seeded admin returns JWT.
9. `test_seeded_event_visible` — `GET /api/events` includes the seeded event.
10. `test_register_login_roundtrip` — create new guest, log in, hit a protected endpoint with the token = 200.
11. `test_booking_flow_against_seeded_listing` — full guest booking → confirmation code returned.
12. `test_invalid_token_rejected` — bogus JWT against a protected endpoint = 401.
13. `test_jwt_secret_is_not_dev_default` — forge a token signed with `"dev-secret-change-me"`, hit a protected endpoint, expect 401. Proves the prod secret is not the default.
14. `test_payment_bypass_actually_shipped` — `GET {WEB_URL}/` and follow into the SPA bundle (or scrape the booking step in a headless browser); assert that the bypass-button text appears and that no Stripe Elements iframe URL is referenced. Catches a misconfigured `VITE_PAYMENTS_ENABLED` shipping Stripe to beta.

**Test 12 from v1 (`test_rate_limit_enforced`) removed from the deploy gate.** Hammering the rate limiter against the live instance interferes with the rest of the suite (the limiter is in-memory and would carry state across tests) and would trip UptimeRobot if it spans 5 min. Move it to a separate one-off operations check rather than a per-deploy gate. The limiter is a non-critical defense; if it's broken, the security checklist (Layer 5) catches it weekly.

**Hard gate rule:** if any of the 14 fail after deploy, roll back via `git revert` + push.

### Layer 3 — Synthetic monitoring (always-on)

- UptimeRobot HTTP monitor → `{BASE_URL}/health` every 5 min, email on >5 min outage. Also keeps Render warm.
- UptimeRobot keyword monitor → `GET {WEB_URL}/` checking `"EventPark"` in body. Catches up-but-broken cases on the user-visible surface.
- (Deferred: a 30-min synthetic that runs the register-login-list-events round trip via cron-job.org or a scheduled GitHub Action.)

**Cold-path note:** Render dyno (~15s after 15-min idle) + Neon compute auto-suspend (~1–3s) can push first-request latency to ~20s. UptimeRobot's default 30s timeout absorbs this; if you tighten the timeout, alerts will fire on every legitimate cold start.

### Layer 4 — Manual exploratory checklist

`tests/deploy/manual_checklist.md`. 13 paths covering anonymous, guest, host, admin, mobile, and SPA-refresh behavior. Failures here become GitHub issues, not deploy blockers.

### Layer 5 — Security smoke

`tests/deploy/security_checklist.md`. Run weekly. Covers HSTS header, env-var leakage, auth gating, JWT secret strength, Neon connection-string exposure, rate-limiter health, source-map exposure.

---

## 6. Repository Layout (additions)

```
PARKING PROJECT/
├── .gitignore                      [new]
├── .env.example                    [new]
├── render.yaml                     [new]
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-02-public-beta-deploy-design.md   [this doc]
├── tests/
│   └── deploy/                     [new]
│       ├── __init__.py
│       ├── test_live.py
│       ├── manual_checklist.md
│       └── security_checklist.md
└── web/
    ├── .env.example                [new]
    └── vercel.json                 [new]
```

---

## 7. Rollback & Recovery

- **Bad code deploy:** `git revert <sha>` and push. Render auto-redeploys the prior version in ~3 min. Note: Render free has no instant rollback button — revert-and-push is the only path.
- **Bad data state (e.g. broken seed):** Render shell → `python seed.py --reset`. Wipes and re-seeds the Neon database. Destructive; only run when intentional.
- **Render outage:** UptimeRobot pages, you wait. No action needed unless >1h, in which case escalate to Render support.
- **Neon outage:** Backend will return 500s. Same as above.
- **Account compromise (e.g. JWT secret leaked):** Render → regenerate `JWT_SECRET` env var → all existing tokens invalidate, users must log back in.

---

## 8. Known Limitations Accepted for Beta

- Cold start on first request after 15 min idle (~15–20s including Neon compute resume). UptimeRobot mitigates during business hours.
- Schema changes require wipe-and-reseed (no Alembic).
- No outbound email — testers see confirmations only on the booking detail page.
- No custom domain.
- Free-tier Neon: 500 MB cap, will become a problem somewhere around ~10k bookings.
- No automated CI; the pre-deploy gate is honor-system.
- **Rate limiter is in-memory and per-process.** Render free runs a single uvicorn instance, so this is fine. If we ever scale past 1 worker, the limiter needs a shared store (Redis) or it becomes per-worker-not-per-IP.

---

## 9. Out of Scope / Next Phase Triggers

Move from this design (B-tier minimum-realism) to a higher-realism deploy when **any** of these become true:
- More than ~50 active testers — cold starts and DB cap will bite.
- Real money becomes part of the test — needs Stripe Connect + legal review.
- Custom-domain branding becomes important for credibility.
- A tester loses meaningful work to a deploy-time DB wipe.

At that trigger, the next design doc covers: Postgres on Render Starter ($7), real Resend email, real Stripe test → live, custom domain with Vercel + Render, Alembic migrations, basic CI on GitHub Actions.

---

## Appendix: Spec-review changes (v2)

Corrections from the v1 review:
- **3.1** — fixed false claim about an existing FK pragma branch; clarified that `create_all` is already wired at import time and no startup hook is needed; added Postgres URL-scheme normalization for Neon's `postgres://` strings.
- **3.3** — fixed false claim about a rate-limiter "exempt list"; clarified that the middleware is path-prefix-scoped to `/api/` and `/health` is therefore exempt with no code change.
- **3.4** — added explicit guidance: leave `HTTPS_REDIRECT=false` on Render to avoid redirect loops behind the proxy.
- **3.5** — fail-safe default: missing `VITE_PAYMENTS_ENABLED` means bypass, not Stripe.
- **3.6** — pin Python version on Render via `render.yaml` runtime field.
- **4** — reordered deploy steps to avoid CORS placeholder + redeploy churn.
- **5 / Layer 2** — replaced `test_rate_limit_enforced` (state-leaking, unsuitable for a deploy gate) with `test_payment_bypass_actually_shipped` (catches misconfigured Vercel env). Added `test_user_facing_landing_loads_on_vercel` so the gate covers both the API host's Jinja landing and the user-visible Vercel SPA. Net: 14 tests.
- **8** — added single-worker assumption for the rate limiter, and Neon compute auto-suspend cold-path note.
