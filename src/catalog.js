// Display-only copy of the catalog for rendering the storefront. The
// backend's catalog.js is the real source of truth for prices — this just
// needs to match it so what the buyer sees lines up with what they're
// charged. If you change prices, update both places (or better: expose a
// GET /catalog endpoint from the backend and fetch this at runtime instead
// of hardcoding it — the backend already has that route ready).

export const GAMES = {
  'Mobile Legends': {
    note: '6-9 digit Player ID',
    serverNote: '4-5 digit Server ID (Zone ID)',
    requiresServerId: true,
    packages: [
      { id: 'ml-56', label: '56 diamonds', price: 65 },
      { id: 'ml-278', label: '278 diamonds', price: 299 },
      { id: 'ml-571', label: '571 diamonds', price: 599 },
      { id: 'ml-1783', label: '1783 diamonds', price: 1799 },
    ],
  },
  'Free Fire': {
    note: '9-12 digit player ID',
    requiresServerId: false,
    packages: [
      { id: 'ff-100', label: '100 diamonds', price: 65 },
      { id: 'ff-310', label: '310 diamonds', price: 199 },
      { id: 'ff-520', label: '520 diamonds', price: 319 },
      { id: 'ff-1060', label: '1060 diamonds', price: 629 },
    ],
  },
  'PUBG Mobile': {
    note: 'numeric character ID',
    requiresServerId: false,
    packages: [
      { id: 'pubg-60', label: '60 UC', price: 65 },
      { id: 'pubg-325', label: '325 UC', price: 319 },
      { id: 'pubg-660', label: '660 UC', price: 629 },
      { id: 'pubg-1800', label: '1800 UC', price: 1599 },
    ],
  },
};
