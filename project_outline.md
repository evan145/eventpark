# EventPark — Business Plan

> Draft: May 1, 2026 

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [Market Analysis](#4-market-analysis)
5. [Business Model & Financials](#5-business-model--financials)
6. [Go-to-Market Strategy](#6-go-to-market-strategy)
7. [MVP Product Specification](#7-mvp-product-specification)
8. [Risk & Mitigation](#8-risk--mitigation)
9. [Development Milestones](#9-development-milestones)
10. [Future Expansion](#10-future-expansion)

---

## 1. Executive Summary

EventPark is a peer-to-peer parking reservation platform that connects private homeowners with underutilized driveways and lots to fans attending large events. Homeowners list available spots for specific event dates, fans reserve and pay in advance, and EventPark earns a commission on each booking. Launching in Wisconsin with a focus on college sports (University of Wisconsin, Marquette, Milwaukee), EventPark addresses a gap left by existing parking apps that focus exclusively on commercial lots. The MVP will be bootstrapped, built in 8 weeks, and validated around the next Badgers home game before expanding to concerts, additional universities, and other event types.

---

## 2. The Problem

### For Event Attendees

- **Parking scarcity:** Big events (college football tailgates, concerts) draw thousands to limited parking infrastructure. Fans arriving early still circle for 20-40 minutes.
- **No advance reservation for residential parking:** Existing apps (SpotHero, ParkWhiz) list commercial lots only. The vast majority of available parking near venues — residential driveways, churches, schools, private lots — cannot be reserved.
- **Unpredictable pricing:** Street parking is free but risky. Commercial lots inflate prices dynamically, sometimes charging $60+ for a Saturday football game.
- **Stress and wasted time:** The last 30 minutes before a game should be about tailgating, not searching for a spot.

### For Property Owners

- **Idle asset:** Homeowners near stadiums and venues have driveways, parking pads, or lots that sit empty 50+ weekends a year.
- **No easy monetization:** There is no simple, trusted platform to rent out driveway space for a few hours around an event.
- **Desire for income:** In high-cost areas (and even mid-cost areas like Madison), extra income of $200-$600 per game weekend is attractive.

---

## 3. The Solution

EventPark is a two-sided marketplace:

**Supply side (homeowners):**
- Simple form to list available spots: address, number of spots, price, event/date, photo of driveway
- Receive booking notifications and payment (minus commission) after each event
- Ability to block dates, set recurring availability (e.g., "every home game"), and adjust pricing

**Demand side (fans):**
- Browse available parking near a specific event/venue/date
- Filter by price, distance, spot type
- Reserve + pay in advance with confirmation, GPS directions, and host contact info
- Cancel within a policy window (e.g., 48 hours before event)

**Platform (EventPark):**
- Takes ~20% commission on each completed booking
- Provides trust infrastructure: verified listings, host ratings, dispute resolution
- Handles payments via Stripe Connect split payments

---

## 4. Market Analysis

### Target Market: Wisconsin

**Primary launch:** University of Wisconsin football (Camp Randall Stadium, Madison)
- 8 home games per season × ~75,000 attendance = ~600,000 game-day attendees annually
- Even 1% conversion = 6,000 parking searches; 0.5% booking = 3,000 bookings per season

**Secondary Wisconsin targets:**
- Marquette basketball (Fisher Events Center, Milwaukee) — 15+ home games, 17,000 capacity
- Milwaukee Bucks (Fiserv Forum) — 41+ home games
- Wisconsin Badgers basketball — 15+ home games per season
- Summerfest (Milwaukee) — 250,000+ attendees over 10 days
- Wisconsin Pavilion concerts — 30+ events/year

### Competitive Landscape

| Competitor | Model | Gap |
|---|---|---|
| **SpotHero** | Commercial lots, booking in advance | No residential supply, not events-first |
| **ParkWhiz** | Commercial lot management software | B2B focus, not consumer P2P |
| **BestParking** | Aggregator for commercial lots | No residential, no reservation |
| **Neighbor (Sprout)** | P2P parking in major metros | Not focused on events, not in Wisconsin |

**EventPark's differentiation:**
- First-mover in residential parking for college sports tailgates
- Events-first UX (browse by event, not by location)
- Wisconsin-native trust and community positioning

### TAM / SAM / SOM

- **TAM:** U.S. event parking market ~$12B annually
- **SAM:** Wisconsin large events ~$80M (college sports + concerts + festivals)
- **SOM Year 1:** $40K (capturing 0.05% of SAM, ~1,000 bookings at $25 average × 20% commission)

---

## 5. Business Model & Financials

### Revenue Streams

| Stream | Description | Year 1 Estimate |
|---|---|---|
| **Booking commission** | 20% cut per completed reservation | $40,000 |
| **Premium host listing** | $4.99/month for featured spots (Phase 2) | $0 (not in MVP) |
| **Event sponsor banners** | Local sponsors on event pages (Phase 2) | $0 (not in MVP) |

### Pricing Strategy

- **Base price:** $10-$25 per spot per event (host-set, market-guided)
- **Dynamic suggestions:** Platform recommends price based on event demand, distance to venue, historical data
- **Commission:** 20% of total (host pays 80%, platform keeps 20%)
- **Cancel policy:** Full refund 48+ hours before event; 50% refund 24-48 hours; no refund <24 hours

### Cost Structure (Year 1)

| Cost | Monthly | Annual |
|---|---|---|
| Domain + hosting (Vercel/Render free tier) | $0 | $0 |
| PostgreSQL (Supabase free tier → paid) | $0 → $25 | $250 |
| Stripe processing fees | 2.9% + $0.30/per tx | ~$2,500 |
| SSL/security/tools | $10 | $120 |
| Insurance (event liability) | $50 | $600 |
| Legal (LLC formation, TOS) | — | $500 |
| Marketing (flyers, social ads) | $50 | $600 |
| **Total** | | **~$4,570** |

### Unit Economics (per booking)

- Average booking: $20
- Commission (20%): $4.00
- Stripe fees (2.9% + $0.30): $0.88
- Net contribution: $3.12 per booking
- **Break-even:** ~1,467 bookings per year

### Revenue Projections

| Scenario | Bookings/Year | Net Revenue (after Stripe) |
|---|---|---|
| Conservative | 500 | $1,390 |
| Base | 1,500 | $4,170 |
| Optimistic | 5,000 | $13,900 |

> Note: These are net-of-Stripe. Gross commission would be $10K, $30K, $100K respectively. Year 1 is validation; scale comes Years 2-3.

---

## 6. Go-to-Market Strategy

### Phase 1: Homeowner Recruitment (Weeks 1-4 of launch)

**Goal:** 50 listings within 2 miles of Camp Randall Stadium

**Tactics:**
- Door hangers / flyers in neighborhoods within 1-2 miles of stadium
- Nextdoor posts: "Turn your driveway into extra income — earn $40/game weekend"
- Facebook groups: Madison neighborhoods, UW fan groups, "Madison Buy Nothing" (not right fit, but similar community groups)
- UW student ambassadors: Offer free parking credit for recruiting 5 hosts
- Instagram/TikTok: "Be your own parking lot" video content

### Phase 2: Demand Generation (Weeks 5-8 of launch)

**Goal:** Convert homepage visitors to bookings around next Badgers home game

**Tactics:**
- Instagram/Facebook ads targeted to UW fans: "Park before you pack — reserve your tailgate spot now"
- Reddit: r/Badgers, r/Madison posts
- Email outreach to Badger fan club newsletters
- Cross-promotion with local tailgate companies
- SEO: "Parking near Camp Randall" long-tail keywords

### Chicken-and-Egg Solution

- **Bootstrap supply first:** Before marketing to fans, secure 50+ host listings manually
- **Incentivize early hosts:** First 20 hosts get 0% commission for 3 months
- **Guarantee minimum availability:** Pre-fill with partner lots (churches, schools) that allow weekend parking
- **Soft launch timing:** Launch 3-4 weeks before next home game to build momentum

---

## 7. MVP Product Specification

### Core Features

**Landing Page / Event Directory**
- Search bar: enter event or venue, see available dates
- Calendar view showing which dates have parking available
- Featured events (next 3 Badgers home games)

**Homeowner Onboarding**
- Simple form: name, email, phone, address, # of spots, photo upload
- Event/date picker: select which games/dates to list
- Price input: with suggested price range shown
- One-click submit → pending approval (manual at first)

**Browse / Search**
- Filter by: event, date, max price, distance, spots needed
- Map view + list view
- Spot cards showing: price, distance, # spots, host rating, photo

**Booking Flow**
1. User selects spot → 2. Reviews details + total + policy → 3. Enters payment info → 4. Confirmation + GPS link + host details

**Payment Processing**
- Stripe Connect: platform takes 20%, host receives 80%
- Charge card at booking time, hold funds until 24 hours post-event, then release
- Refund handling per cancel policy

**User Accounts**
- Guest booking (no account required for first booking)
- Account creation after first booking (optional)
- Host dashboard: upcoming bookings, earnings, manage listings

**Admin** (minimal for MVP)
- Approve/reject host listings
- View booking stats, revenue dashboard
- Manual dispute handling

### Out of Scope for MVP

- Native mobile app (PWA/webapp only)
- In-app messaging (use email/SMS)
- Dynamic pricing algorithm (manual suggestions)
- Recurring auto-listing (hosts manually list each game)
- Insurance integration (manual verification for now)

### Recommended Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | FastHTML / Python or Next.js (React) | FastHTML if already familiar; Next.js if seeking broader ecosystem |
| **Backend** | Python/FastAPI | Lightweight, fast prototyping |
| **Database** | PostgreSQL (Supabase free tier) | Structured data, free up to limits |
| **Payments** | Stripe Connect (Express) | Split payments, built-in compliance |
| **Hosting** | Vercel (frontend) + Render/Railway (backend) | Free tiers, easy deployment |
| **Auth** | Supabase Auth or Clerk | Quick setup, social login |
| **Maps** | Mapbox or Leaflet (free tier) | Display spot locations |
| **Email** | Resend or SendGrid (free tier) | Confirmation emails, host notifications |

### User Flows

```
HOMEOWNER FLOW:
Landing → "List Your Spots" → Sign up → Enter address + spots + photos
  → Select dates → Set price → Submit → (Admin approval) → Listed

FAN FLOW:
Landing → Search event/venue → Select date → Browse spots
  → Select spot → Enter guest info + payment → Confirmation
  → Receive GPS directions + host details → Day of: show confirmation
  → Post-event: review host
```

### Wireframe Layout

```
┌─────────────────────────────────┐
│  EventPark                      │
│  "Park Before You Pack"         │
├─────────────────────────────────┤
│  Search: [Camp Randall] [Date]  │
├─────────────────────────────────┤
│  UPCOMING EVENTS                │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ Sept │ │ Sept │ │ Sept │    │
│  │  8   │ │ 20   │ │ 27   │    │
│  │ vs   │ │ vs   │ │ vs   │    │
│  │ Notre│ │ Iowa │ │ Ohio │    │
│  │ Dame │ │      │ │ St.  │    │
│  │ 23   │ │ 52   │ │ 18   │    │
│  │ spots│ │ spots│ │ spots│    │
│  └──────┘ └──────┘ └──────┘    │
├─────────────────────────────────┤
│  HOW IT WORKS                   │
│  1. Browse spots    2. Reserve  │
│  3. Park & enjoy                   │
├─────────────────────────────────┤
│  [List Your Spots]  [Find Parking]│
└─────────────────────────────────┘
```

---

## 8. Risk & Mitigation

### Insurance / Liability

**Risk:** Guests park on private property; accidents, injuries, or disputes could create liability exposure.

**Mitigation:**
- Terms of Service clearly disallows EventPark liability; hosts are independent operators
- Partner with an on-demand insurance provider (e.g., Howdy, Sesame) for per-event coverage — $0.50-$1 per booking
- Initially: require hosts to confirm they have homeowner's insurance that covers occasional guests
- Longer term: negotiate a commercial policy covering all transactions

### HOA / Municipal Regulation

**Risk:** Homeowners associations or city ordinances may prohibit renting driveway space.

**Mitigation:**
- Pre-screen host addresses: flag known HOA-restricted neighborhoods
- Madison city code review: verify residential parking rental is permitted (likely OK for occasional use)
- Host onboarding includes a checkbox: "I confirm I am permitted to rent parking at my address"
- Keep it casual/frequent enough that it doesn't draw attention, but not so commercial that it violates zoning

### Liquidity (Chicken-and-Egg)

**Risk:** No hosts → no demand. No demand → no hosts sign up.

**Mitigation:**
- See Go-to-Market Strategy, Phase 1
- Manual seeding: personally recruit 20 hosts before opening doors
- Alternative supply: partner with churches, schools, or community centers that have empty lots on game days

### Trust / Safety

**Risk:** Guests arriving to find no spot, host no-show, wrong location, conflict.

**Mitigation:**
- Verified email/phone for hosts
- Photo requirement for listings (driveway/street view)
- Ratings and reviews after each booking
- Clear cancellation policy protecting both sides
- Dispute resolution process (email-based initially)

### Seasonality

**Risk:** College football season is 3-4 months; platform has little demand the rest of the year.

**Mitigation:**
- Expand to basketball season (November-March) to cover off-months
- Add concerts, festivals, summer events
- Multi-market expansion to smooth seasonality (different schools, different schedules)

---

## 9. Development Milestones

### Sprint 0: Setup (Week 1)

- Register LLC, open business bank account
- Set up Stripe Connect account
- Domain registration + DNS
- Project repository, CI/CD pipeline
- Database schema design and provisioning
- Wireframe refinement

**Deliverable:** Development environment ready, schema designed

### Sprint 1: Core Infrastructure (Week 2)

- Auth system (host + guest)
- Database tables: hosts, listings, bookings, payments, events
- Admin panel (basic)
- Landing page (static, polished)

**Deliverable:** Backend scaffolding, functional auth, landing page live

### Sprint 2: Host Flow (Week 3)

- Host onboarding form with file upload (photos)
- Listing creation: address, dates, price, capacity
- Listing management (edit, delete, view status)
- Admin approval workflow

**Deliverable:** Hosts can submit listings, admin can approve

### Sprint 3: Guest Booking Flow (Week 4)

- Event/search page
- Spot browsing (list + map view)
- Booking form with Stripe integration (test mode)
- Confirmation email

**Deliverable:** End-to-end booking in test mode

### Sprint 4: Payments + Notifications (Week 5)

- Stripe payment processing (live mode, sandbox hosts)
- Payment split logic (20% platform, 80% host)
- Host payout notifications
- Booking confirmation + GPS directions
- Cancellation/refund flow

**Deliverable:** Functional payments, both sides get notified

### Sprint 5: Polish + Launch Prep (Week 6)

- Terms of Service + Privacy Policy pages
- Review/rating system
- Error handling, edge cases
- Mobile responsiveness testing
- SEO basics (meta tags, sitemap)

**Deliverable:** Product ready for soft launch

### Sprint 6: Soft Launch (Week 7)

- Recruit first 20 hosts (manual outreach)
- Enable bookings for 1-2 upcoming events
- Monitor, debug, collect feedback
- Iterate on UX based on real usage

**Deliverable:** First real transactions

### Sprint 7: Go Live + Marketing Push (Week 8)

- Public launch
- Execute demand generation plan (ads, social, fan groups)
- Track key metrics daily

**Deliverable:** Public launch complete

**Success Metrics (Week 8 targets):**
- 25+ active host listings
- 10+ completed bookings
- <5% booking failure rate
- NPS >30

---

## 10. Future Expansion

### Phase 2 Features (Months 3-6)

- Recurring listing: hosts auto-list for all home games
- In-app messaging between host and guest
- Dynamic pricing suggestions based on demand
- Badges/levels for top-rated hosts
- iOS/Android native apps

### Market Expansion

| Wave | Target | Rationale |
|---|---|---|
| **1** | UW football + basketball (Madison) | Home turf, existing network |
| **2** | Marquette + Bucks (Milwaukee) | High-frequency events |
| **3** | Summerfest + Wisconsin Pavilion | Summer revenue bridge |
| **4** | Indiana schools (Purdue, Notre Dame) | Big tailgating culture |
| **5** | SEC / Big Ten expansion | Large stadiums, passionate fanbases |
| **6** | Concerts / festivals nationwide | Largest TAM |

### Long-Term Vision

- **EventPark+**: Premium tier with guaranteed spot, valet option, shuttle service
- **B2B**: License the platform to venues/stadiums that want to manage overflow parking
- **Merch tailgating**: Partner with tailgate companies for bundled parking + prep packages
- **Data monetization**: Anonymized event-attendance data for sponsors, venues

---

*This document is a living plan. Update as assumptions are validated or invalidated.*