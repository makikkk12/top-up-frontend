import { useEffect, useState } from 'react';
import { GAMES } from './catalog.js';
import { createOrder, getOrder, verifyPlayerId } from './api.js';

function fmt(n) {
  return '₱' + n.toLocaleString();
}

function Storefront() {
  const gameNames = Object.keys(GAMES);
  const [game, setGame] = useState(gameNames[0]);
  const [playerId, setPlayerId] = useState('');
  const [serverId, setServerId] = useState('');
  const [pkgIndex, setPkgIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verification state: idle | checking | found | not_found | unsupported | service_down
  const [verifyState, setVerifyState] = useState('idle');
  const [verifiedNickname, setVerifiedNickname] = useState('');

  const pkg = pkgIndex !== null ? GAMES[game].packages[pkgIndex] : null;
  const needsServerId = GAMES[game].requiresServerId;

  function handleGameChange(next) {
    setGame(next);
    setPkgIndex(null);
    setError('');
    setPlayerId('');
    setServerId('');
    resetVerification();
  }

  function resetVerification() {
    setVerifyState('idle');
    setVerifiedNickname('');
  }

  function handlePlayerIdChange(value) {
    setPlayerId(value);
    resetVerification();
  }

  function handleServerIdChange(value) {
    setServerId(value);
    resetVerification();
  }

  async function handleVerify() {
    if (!playerId.trim()) {
      setError('Enter your Player ID first.');
      return;
    }
    if (needsServerId && !serverId.trim()) {
      setError('Enter your Server ID first.');
      return;
    }
    setError('');
    setVerifyState('checking');

    try {
      const result = await verifyPlayerId({
        game,
        playerId: playerId.trim(),
        serverId: serverId.trim(),
      });

      if (!result.supported) {
        setVerifyState('unsupported');
      } else if (result.serviceDown) {
        setVerifyState('service_down');
      } else if (result.verified) {
        setVerifyState('found');
        setVerifiedNickname(result.nickname);
      } else {
        setVerifyState('not_found');
      }
    } catch (err) {
      // Network failure talking to our own backend — treat the same as a
      // down verification service, never block checkout over this.
      setVerifyState('service_down');
    }
  }

  async function handleCheckout() {
    setError('');
    if (!playerId.trim()) {
      setError('Enter your in-game ID first.');
      return;
    }
    if (needsServerId && !serverId.trim()) {
      setError('Enter your Server ID first.');
      return;
    }
    if (!pkg) {
      setError('Choose a package first.');
      return;
    }
    if (verifyState === 'not_found') {
      setError('That ID could not be found. Double-check it before continuing.');
      return;
    }

    setLoading(true);
    try {
      const combinedPlayerId = needsServerId
        ? `${playerId.trim()} (${serverId.trim()})`
        : playerId.trim();

      const { checkoutUrl } = await createOrder({
        packageId: pkg.id,
        playerId: combinedPlayerId,
        game,
      });
      // Send the buyer to Xendit's hosted checkout page. They'll be
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
        onChange={(e) => handlePlayerIdChange(e.target.value)}
      />
      <p className="hint">{GAMES[game].note}</p>

      {needsServerId && (
        <>
          <label className="field-label">Server ID</label>
          <input
            type="text"
            placeholder={GAMES[game].serverNote}
            value={serverId}
            onChange={(e) => handleServerIdChange(e.target.value)}
          />
          <p className="hint">{GAMES[game].serverNote}</p>
        </>
      )}

      <button
        className="verify-btn"
        onClick={handleVerify}
        disabled={verifyState === 'checking'}
        type="button"
      >
        {verifyState === 'checking' ? 'Checking…' : 'Verify ID'}
      </button>

      {verifyState === 'found' && (
        <p className="verify-result verify-found">
          ✓ Account found: <strong>{verifiedNickname}</strong>
        </p>
      )}
      {verifyState === 'not_found' && (
        <p className="verify-result verify-error">
          ✗ No account found with this ID. Please double-check it.
        </p>
      )}
      {verifyState === 'service_down' && (
        <p className="verify-result verify-warning">
          Couldn't verify automatically right now — double-check your ID before paying.
        </p>
      )}
      {verifyState === 'unsupported' && (
        <p className="verify-result verify-warning">
          Live verification isn't available for this game yet — double-check your ID before paying.
        </p>
      )}

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
        You'll be redirected to a secure Xendit checkout page to complete payment.
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
          This updates automatically once Xendit confirms your payment. If you already paid,
          this can take a few seconds.
        </p>
      )}
      <a href="/" className="back-link">← Back to store</a>
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
