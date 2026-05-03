# EventPark — Frontend Test Specification

> Acceptance criteria for the EventPark web frontend. Tests cover page rendering, component behavior, user flows, form validation, API integration (mocked against the backend in `app/`), accessibility, responsiveness, and SEO.

---

## Test Configuration

```
Component / unit tests:    Vitest + React Testing Library  (or Jest + RTL)
End-to-end tests:          Playwright
API mocking:               MSW (Mock Service Worker)
Visual regression:         Playwright screenshot snapshots
Accessibility:             axe-core via @axe-core/playwright
Viewport sweep:            mobile (375x667), tablet (768x1024), desktop (1280x800)
```

Tests should run against a dev build with the backend either live (`pytest`-validated app) or fully mocked via MSW.

---

## 1. Landing Page (`/`)

### 1.1 Render & Hero

```ts
test('landing page renders with EventPark branding')
test('hero displays tagline "Park Before You Pack"')
test('hero shows two primary CTAs: "Find Parking" and "List Your Spots"')
test('hero search bar accepts venue name and date')
test('clicking "Find Parking" CTA without input scrolls to events section')
test('clicking "List Your Spots" CTA navigates to /host/signup')
```

### 1.2 Upcoming Events Carousel

```ts
test('upcoming events section fetches GET /api/events on mount')
test('displays up to 3 featured event cards')
test('each event card shows date, opponent/name, available-spots count')
test('clicking an event card navigates to /events/:id')
test('shows skeleton loaders while events are loading')
test('shows empty state when no upcoming events')
test('shows error toast when /api/events fails')
```

### 1.3 "How It Works" Section

```ts
test('how it works renders 3 numbered steps')
test('steps are: 1. Browse spots, 2. Reserve, 3. Park & enjoy')
```

### 1.4 SEO & Meta

```ts
test('document title contains "EventPark"')
test('meta description is present and non-empty')
test('Open Graph tags present (og:title, og:description, og:image)')
test('canonical link tag points to current URL')
test('JSON-LD Organization schema present in head')
```

---

## 2. Event Directory (`/events`)

```ts
test('events page lists all upcoming events sorted by date asc')
test('venue filter input narrows results client-side or via query param')
test('date filter pickers narrow results to a date range')
test('selecting an event navigates to /events/:id')
test('shows "no events match" empty state when filters exclude everything')
test('past events are not shown by default')
test('toggle "show past events" reveals completed events')
```

---

## 3. Event Detail & Spot Browse (`/events/:id`)

### 3.1 Event Header

```ts
test('event detail fetches GET /api/events/:id')
test('header shows event name, venue, date, time, total available spots')
test('shows venue address with link to map')
```

### 3.2 Spot List

```ts
test('fetches GET /api/events/:id/spots and renders one card per listing')
test('each spot card shows price, distance, # spots, host rating, photo')
test('only approved listings appear (no pending, rejected, inactive)')
test('clicking a spot card opens spot detail / booking modal')
```

### 3.3 Filters & Sorting

```ts
test('sort dropdown supports: price asc, price desc, distance, rating')
test('max-price slider filters spots client-side or via ?max_price')
test('min-spots stepper filters listings with fewer than N spots')
test('radius slider (0.5–5 mi) filters by distance from venue')
test('clearing all filters restores full list')
test('filter state persists in URL query string')
```

### 3.4 Map View

```ts
test('toggle switches between list view and map view')
test('map view renders pins for each spot at correct lat/lng')
test('clicking a pin opens a popover with price + photo + "Book" button')
test('venue is highlighted with a distinct icon')
test('map auto-centers and fits bounds to all visible spots')
```

---

## 4. Spot Detail & Booking Flow

### 4.1 Spot Detail (`/listings/:id`)

```ts
test('fetches GET /api/listings/:id and renders all fields')
test('shows host name, rating, total bookings')
test('shows photo gallery (if photos exist) with lightbox')
test('shows distance to venue in miles')
test('shows GPS link button that opens maps app')
test('"Reserve" CTA opens booking flow')
```

### 4.2 Booking Step 1 — Select Spots

```ts
test('spots-needed stepper defaults to 1, max = available_spots')
test('stepper cannot go below 1 or above available')
test('total price updates live as stepper changes')
test('"Continue" disabled until valid selection')
```

### 4.3 Booking Step 2 — Review & Contact

```ts
test('review screen shows spot summary, # spots, unit price, total')
test('shows cancellation policy verbatim (48h full / 24-48h 50% / <24h none)')
test('guest contact form requires name, email, phone')
test('email validates format')
test('phone validates US format')
test('logged-in users see name/email pre-filled and read-only')
test('back button returns to step 1 with state preserved')
```

### 4.4 Booking Step 3 — Payment

```ts
test('Stripe Elements card field renders')
test('"Pay $X" button shows correct total')
test('button disabled while Stripe is loading')
test('invalid card shows inline Stripe error')
test('successful payment calls POST /api/bookings with payment intent')
test('payment failure shows error and stays on step 3')
test('double-click prevention: button disables on first click')
```

### 4.5 Booking Step 4 — Confirmation

```ts
test('confirmation screen shows confirmation code (EP-YYYYMMDD-XXXX)')
test('shows host name and phone for day-of contact')
test('shows GPS directions link')
test('shows "Add to Calendar" button (.ics download)')
test('shows "Email me a copy" success indicator')
test('confirmation page is shareable via direct URL /bookings/:id')
```

---

## 5. Host Onboarding & Dashboard

### 5.1 Host Signup (`/host/signup`)

```ts
test('signup form requires email, password, full name, address, phone')
test('password strength meter updates as user types')
test('submitting valid form calls POST /api/auth/register with role=host')
test('duplicate email shows inline error')
test('successful signup stores JWT and redirects to /host/dashboard')
```

### 5.2 Listing Creation (`/host/listings/new`)

```ts
test('multi-step form: address → spots/price → photos → events → review')
test('address autocomplete suggests results as user types')
test('selecting an address prefills lat/lng (geocoded)')
test('number-of-spots stepper enforces min 1')
test('price input rejects values <= 0')
test('photo uploader accepts up to 5 images')
test('photo >10MB shows error and is rejected')
test('photo previews render before upload')
test('event picker shows upcoming events with checkboxes')
test('review screen shows all entered data before submit')
test('submit calls POST /api/host/listings; success → /host/dashboard')
test('on submit the listing appears with status "Pending Approval"')
```

### 5.3 Host Dashboard (`/host/dashboard`)

```ts
test('dashboard requires authentication; redirects to login if no token')
test('shows three sections: My Listings, Upcoming Bookings, Earnings')
test('My Listings shows status badges (pending, approved, rejected, inactive)')
test('clicking a listing opens edit page')
test('Upcoming Bookings shows spot, guest first name, date, # spots')
test('host cannot see full guest PII before booking confirmed')
test('Earnings widget shows lifetime total + pending payout amount')
test('"Add Listing" CTA navigates to /host/listings/new')
```

### 5.4 Listing Edit (`/host/listings/:id/edit`)

```ts
test('form pre-populates with current listing data')
test('host cannot edit a listing they do not own (404 or 403 page)')
test('saving calls PUT /api/host/listings/:id')
test('"Delete" button soft-deletes (status=inactive) after confirm modal')
```

---

## 6. Auth UI

### 6.1 Login (`/login`)

```ts
test('form requires email and password')
test('valid credentials store JWT and redirect to original page or home')
test('invalid credentials show inline error')
test('"Forgot password?" link present (placeholder OK in MVP)')
test('"Sign up" link routes to appropriate signup based on context')
```

### 6.2 Session Management

```ts
test('expired JWT triggers automatic logout and redirect to /login')
test('logout clears token and protected routes redirect')
test('refreshing the page preserves auth state')
test('navbar shows "Log in" when logged out, user menu when logged in')
```

---

## 7. Admin Console (`/admin`)

```ts
test('admin route blocks non-admin users (redirect or 403 page)')
test('Pending Listings tab fetches /api/admin/listings?status=pending')
test('Approve / Reject buttons call PATCH /api/admin/listings/:id/status')
test('reject prompts for reason before submit')
test('All Bookings tab paginates results')
test('Revenue dashboard shows total commission, gross, booking count')
test('Events tab supports create / delete with confirmation modal')
test('Disputes tab lists open disputes with resolve form')
```

---

## 8. Forms & Validation (cross-cutting)

```ts
test('all form inputs have associated <label>s')
test('inline errors appear below the offending field, not in alerts')
test('errors clear when the user types a valid value')
test('submit buttons disable while in-flight')
test('network error shows toast + leaves form data intact')
test('all forms can be submitted via Enter key on the last field')
```

---

## 9. Navigation & Layout

```ts
test('header is sticky on scroll')
test('logo in header links to /')
test('mobile nav collapses into hamburger menu < 768px')
test('hamburger menu opens drawer with all top-level links')
test('footer present on all pages with TOS, Privacy, Contact links')
test('breadcrumbs render on event detail and host pages')
test('active nav item is visually highlighted')
test('back button works after every navigation')
```

---

## 10. Loading, Empty & Error States

```ts
test('every list/grid has a skeleton loader during fetch')
test('every list has a designed empty state with icon + helper copy')
test('every fetch failure shows a retry button')
test('global error boundary catches render errors and shows fallback UI')
test('404 page renders for unknown routes with link home')
test('500 page renders for backend errors with link home')
test('offline banner appears when navigator.onLine === false')
```

---

## 11. Accessibility

```ts
test('axe-core finds zero violations on /')
test('axe-core finds zero violations on /events/:id')
test('axe-core finds zero violations on the booking flow')
test('all interactive elements are reachable via Tab')
test('focus is trapped inside modals and returned on close')
test('color contrast meets WCAG AA on primary text + buttons')
test('all images have alt text or alt=""')
test('form errors are announced to screen readers (aria-live)')
test('skip-to-content link present and visible on focus')
```

---

## 12. Responsive Design

```ts
test('landing renders without horizontal scroll at 375px width')
test('event detail map view adapts to mobile (full-width)')
test('spot cards stack to 1 column on mobile, 2 on tablet, 3+ on desktop')
test('booking flow is single-column and tap-friendly on mobile')
test('host dashboard tables become accordion cards on mobile')
test('hit targets are at least 44x44px on mobile')
test('text is at least 16px on mobile (no auto-zoom on iOS)')
```

---

## 13. Performance

```ts
test('Lighthouse performance score >= 85 on /')
test('Lighthouse performance score >= 80 on /events/:id')
test('first contentful paint < 1.5s on a fast 3G profile')
test('JS bundle for landing page < 200KB gzipped')
test('images are lazy-loaded below the fold')
test('Stripe.js is loaded only when entering payment step')
test('map library is code-split, not in main bundle')
```

---

## 14. Analytics & Tracking

```ts
test('page_view event fires on every route change')
test('search_submit event fires when user submits search')
test('listing_view event fires when spot detail opens')
test('booking_started event fires on entering booking flow')
test('booking_completed event fires on confirmation page')
test('host_signup event fires on successful host registration')
test('events are not double-fired on remount')
test('analytics is disabled in test environment')
```

---

## 15. End-to-End User Journeys (Playwright)

### 15.1 Fan Books a Spot

```ts
test('e2e: visitor browses event, picks spot, books, sees confirmation', async ({ page }) => {
  // 1. Navigate to /
  // 2. Click first upcoming event
  // 3. Filter by max price $20
  // 4. Click cheapest spot
  // 5. Reserve 2 spots
  // 6. Fill guest contact info
  // 7. Enter Stripe test card 4242 4242 4242 4242
  // 8. Submit
  // 9. Verify confirmation code matches /^EP-\d{8}-[A-Z0-9]{4}$/
  // 10. Verify GPS link is present and clickable
});
```

### 15.2 Homeowner Lists a Spot

```ts
test('e2e: new homeowner signs up, lists driveway, sees pending status', async ({ page }) => {
  // 1. Click "List Your Spots" on /
  // 2. Sign up with new email
  // 3. Walk through new-listing wizard
  // 4. Upload 2 photos
  // 5. Select 2 upcoming events
  // 6. Submit
  // 7. Land on /host/dashboard
  // 8. Verify listing appears with "Pending Approval" badge
});
```

### 15.3 Cancellation with Refund

```ts
test('e2e: guest cancels >48h out and receives full refund toast', async ({ page }) => {
  // 1. Log in as guest with existing booking
  // 2. Navigate to /bookings/:id
  // 3. Click "Cancel Booking"
  // 4. Confirm in modal
  // 5. Verify success toast: "Full refund issued"
  // 6. Booking status updates to "Cancelled"
});
```

### 15.4 Admin Approves a Listing

```ts
test('e2e: admin approves a pending listing and host sees status change', async ({ page, context }) => {
  // 1. Admin logs in, opens /admin
  // 2. Sees pending listing in queue
  // 3. Clicks Approve
  // 4. Switch context to host's session
  // 5. Refresh /host/dashboard
  // 6. Listing badge now reads "Approved"
});
```

### 15.5 Concurrent Booking — Last Spot

```ts
test('e2e: two browsers race for the last spot; one wins, one sees 409', async () => {
  // 1. Open two pages on the same spot detail with available_spots=1
  // 2. Both click "Reserve" simultaneously
  // 3. One reaches confirmation page
  // 4. The other sees an error: "Spot no longer available"
});
```

---

## 16. Trust & Safety UI

```ts
test('host listings show "Verified" badge when address_verified=true')
test('listing detail shows host rating with star visualization')
test('cancellation policy is linked from booking flow + footer')
test('TOS and Privacy Policy pages render at /terms and /privacy')
test('contact-support form on /contact submits and shows confirmation')
test('cookie consent banner appears on first visit and persists choice')
```

---

## 17. Visual Regression (Playwright Snapshots)

```ts
test('snapshot: landing hero — desktop')
test('snapshot: landing hero — mobile')
test('snapshot: event detail with spots — desktop')
test('snapshot: spot card variants (with/without photo, varying rating)')
test('snapshot: booking step 3 payment screen')
test('snapshot: confirmation screen')
test('snapshot: host dashboard empty state')
test('snapshot: 404 page')
```

---

## Coverage Targets

> Component / unit: **80%+**
> Critical user flows (search → book → confirm, host signup → list): **100% E2E coverage**
> Accessibility: **0 axe violations** on every page in section 11
> Performance: meets thresholds in section 13 in CI

---

## Test Runner Commands

```bash
# Component / unit tests
npm run test                    # vitest watch
npm run test:run                # vitest single pass
npm run test:coverage           # with coverage report

# End-to-end
npx playwright test             # all browsers
npx playwright test --project=chromium
npx playwright test --ui        # interactive

# Accessibility-only sweep
npx playwright test tests/a11y/

# Visual regression
npx playwright test --update-snapshots   # to refresh
```
