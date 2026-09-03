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
