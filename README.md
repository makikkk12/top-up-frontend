# Top-up frontend

A React (Vite) storefront that talks to the `topup-backend` from the previous
step. Buyer picks a game, enters their player ID, picks a package, and gets
redirected to PayMongo's hosted checkout (GCash, Maya, card).

## Setup

1. Make sure `topup-backend` is running (`npm start` in that folder,
   default `http://localhost:4000`).
2. `npm install`
3. `cp .env.example .env` — defaults to pointing at `http://localhost:4000`,
   change `VITE_API_URL` if your backend runs elsewhere.
4. `npm run dev` — opens on `http://localhost:3000`.

## How it fits together

- `src/catalog.js` — display copy of the price list. The backend's
  `catalog.js` is still what actually determines the charge; keep both in
  sync, or better, fetch `GET /catalog` from the backend at runtime instead
  of hardcoding (the backend already exposes that route).
- `src/api.js` — thin wrapper around `fetch` calling the backend's
  `/orders` endpoints.
- `src/App.jsx` — three views in one component: the storefront, a
  `/success` page that polls order status until the webhook marks it paid,
  and a `/cancel` page.

## Testing the full flow end-to-end

1. Both servers running (backend on 4000, frontend on 3000).
2. Backend's `.env` needs `CHECKOUT_SUCCESS_URL=http://localhost:3000/success`
   and `CHECKOUT_CANCEL_URL=http://localhost:3000/cancel` (already the
   defaults in `.env.example`).
3. Set up the PayMongo webhook pointing at your tunnel URL (see the
   backend's README) so payments actually get marked `paid`.
4. Go through checkout using PayMongo's test-mode GCash/card flow (their
   docs list test credentials that always succeed or always fail, useful
   for testing both paths).

## Before going live

- Swap the hardcoded catalog for a live fetch from `GET /catalog` so prices
  can't drift out of sync between frontend and backend.
- Add basic input validation on the player ID per game (length/format
  checks) to cut down on failed deliveries from typos.
- Point `VITE_API_URL` at your deployed backend's real URL, and deploy the
  frontend as a static build (`npm run build` → `dist/`) to something like
  Vercel, Netlify, or your own server.
