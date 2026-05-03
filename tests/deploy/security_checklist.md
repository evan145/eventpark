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
