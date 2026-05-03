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
