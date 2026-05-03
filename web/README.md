# EventPark Web

Vite + React + TypeScript MVP for the EventPark frontend.

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

Backend (FastAPI) is expected at `http://localhost:8000` and is proxied via `/api`.

## Test

```bash
npm run test            # vitest watch
npm run test:run        # vitest single pass
npm run test:coverage   # with coverage
npm run test:e2e        # Playwright (starts dev server)
```

## Build

```bash
npm run build
npm run preview
```

## Stack

- React 18 + TypeScript (strict)
- Vite 5
- React Router v6
- TanStack Query v5
- Tailwind CSS v3 (primary color: red-600 / Wisconsin red)
- Stripe Elements (lazy-loaded at booking step 3)
- React Leaflet (lazy-loaded on map toggle)
- React Hook Form + Zod
- MSW v2 for component test mocks
- Playwright for E2E + visual + a11y
- @axe-core/playwright

## Env

`VITE_STRIPE_PK` — defaults to `pk_test_placeholder`.
`VITE_API_URL` — defaults to `''` (relative; uses Vite proxy in dev).
