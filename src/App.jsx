import { useEffect, useState } from 'react';
import { GAMES } from './catalog.js';
import { createOrder, getOrder } from './api.js';

function fmt(n) {
  return '₱' + n.toLocaleString();
}

function Storefront() {
  const gameNames = Object.keys(GAMES);
  const [game, setGame] = useState(gameNames[0]);
  const [playerId, setPlayerId] = useState('');
  const [pkgIndex, setPkgIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pkg = pkgIndex !== null ? GAMES[game].packages[pkgIndex] : null;

  function handleGameChange(next) {
    setGame(next);
    setPkgIndex(null);
    setError('');
  }

  async function handleCheckout() {
    setError('');
    if (!playerId.trim()) {
      setError('Enter your in-game ID first.');
      return;
    }
    if (!pkg) {
      setError('Choose a package first.');
      return;
    }

    setLoading(true);
    try {
      const { checkoutUrl } = await createOrder({
        packageId: pkg.id,
        playerId: playerId.trim(),
        game,
      });
      // Send the buyer to PayMongo's hosted checkout page. They'll be
      // redirected back to CHECKOUT_SUCCESS_URL / CHECKOUT_CANCEL_URL
      // (configured in the backend's .env) once they've paid or bailed.
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.message || 'Something went wrong starting checkout.');
      setLoading(false);
    }
  }

  return (
    <div className="storefront">
      <h1>Top up your game</h1>

      <div className="game-tabs">
        {gameNames.map((name) => (
          <button
            key={name}
            className={name === game ? 'game-btn active' : 'game-btn'}
            onClick={() => handleGameChange(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <label className="field-label">Player ID</label>
      <input
        type="text"
        placeholder={GAMES[game].note}
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
      />
      <p className="hint">{GAMES[game].note}</p>

      <div className="package-grid">
        {GAMES[game].packages.map((p, i) => (
          <button
            key={p.id}
            className={pkgIndex === i ? 'pkg-btn active' : 'pkg-btn'}
            onClick={() => setPkgIndex(i)}
          >
            <span>{p.label}</span>
            <span className="pkg-price">{fmt(p.price)}</span>
          </button>
        ))}
      </div>

      <div className="summary">
        <div className="summary-row">
          <span>Package</span>
          <span>{pkg ? `${game} — ${pkg.label}` : '—'}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>{pkg ? fmt(pkg.price) : '₱0'}</span>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button className="checkout-btn" onClick={handleCheckout} disabled={loading}>
        {loading ? 'Starting checkout…' : 'Pay with GCash / Maya / Card'}
      </button>

      <p className="footnote">
        You'll be redirected to a secure PayMongo checkout page to complete payment.
      </p>
    </div>
  );
}

function OrderStatus({ orderId }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await getOrder(orderId);
        if (cancelled) return;
        setOrder(data);
        // Keep polling until the webhook has marked it paid, or give up
        // after ~30 tries (~60s) so we don't poll forever.
        if (data.status === 'pending' && attempts < 30) {
          attempts += 1;
          setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!cancelled) setError('Could not find that order.');
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p>Checking your order…</p>;

  return (
    <div className="order-status">
      <h2>{order.status === 'paid' ? 'Payment confirmed ✅' : 'Waiting for payment confirmation…'}</h2>
      <p>Order ID: {order.id}</p>
      <p>{order.game} — for player ID {order.playerId}</p>
      {order.status !== 'paid' && (
        <p className="hint">
          This updates automatically once PayMongo confirms your payment. If you already paid,
          this can take a few seconds.
        </p>
      )}
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id') || params.get('orderId');
  const isSuccessPage = window.location.pathname === '/success';
  const isCancelPage = window.location.pathname === '/cancel';

  if (isSuccessPage && orderId) {
    return (
      <div className="app">
        <OrderStatus orderId={orderId} />
      </div>
    );
  }

  if (isCancelPage) {
    return (
      <div className="app">
        <h2>Checkout cancelled</h2>
        <p>No payment was made. You can go back and try again.</p>
        <a href="/">Back to store</a>
      </div>
    );
  }

  return (
    <div className="app">
      <Storefront />
    </div>
  );
}
