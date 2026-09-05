const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function createOrder({ packageId, playerId, game }) {
  const res = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId, playerId, game }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to create order');
  }

  return res.json(); // { orderId, checkoutUrl }
}

export async function getOrder(orderId) {
  const res = await fetch(`${API_URL}/orders/${orderId}`);
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

// Looks up a real in-game nickname for the given ID via a free third-party
// service. Never throws on "not found" or "service down" — those come back
// as normal responses with verified: false, since a flaky lookup service
// shouldn't ever hard-block someone from checking out.
export async function verifyPlayerId({ game, playerId, serverId }) {
  const params = new URLSearchParams({ game, playerId });
  if (serverId) params.set('serverId', serverId);

  const res = await fetch(`${API_URL}/verify-id?${params.toString()}`);
  return res.json(); // { verified, supported, nickname? , message? }
}
