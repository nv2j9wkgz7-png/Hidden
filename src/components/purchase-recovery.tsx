'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavigationLink as Link } from './navigation-link';
import { api } from '@/lib/client-api';

export function RequestPurchaseRecovery({
  expired = false,
}: {
  expired?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const email = String(new FormData(event.currentTarget).get('email'));
    try {
      await api('/api/purchases/recover/request', { email });
      setSent(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to send email. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <div className="eyebrow">Your private library</div>
      <h1>Recover your purchases</h1>
      <p>
        Guest access ended? Verify the email you used at checkout, then log in
        or create an account to save your purchases.
      </p>
      {expired && !sent && (
        <p className="notice">
          Your verification link expired or was already used. Request a new one
          below.
        </p>
      )}
      {sent ? (
        <div className="notice" role="status">
          <strong>Check your inbox.</strong>
          <p>
            Open the verification link within 30 minutes, then sign in to claim
            eligible purchases. Check spam if it hasn’t arrived.
          </p>
          <p>
            If a purchase is already saved, log in to the account that saved it.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="checkout-email">Checkout email</label>
            <input
              id="checkout-email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
            />
          </div>
          <button className="primary full" disabled={busy}>
            {busy ? 'Sending…' : 'Send verification link'}
          </button>
        </form>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {sent && (
        <button
          className="text-button"
          onClick={() => {
            setSent(false);
            setError('');
          }}
        >
          Use a different email or try again
        </button>
      )}
      <p className="hint">
        Email is only sent when you ask. Refunded purchases and purchases saved
        to another account cannot be claimed.
      </p>
      <Link href="/purchases">Already saved? Open My purchases ↗</Link>
    </div>
  );
}

export function VerifyPurchaseRecovery() {
  const router = useRouter();
  const started = useRef(false);
  const token = useRef<string | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(true);
  async function verify() {
    setBusy(true);
    setError('');
    try {
      await api('/api/purchases/recover/verify', { token: token.current });
      router.replace('/purchases/recover/claim');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not verify this link.',
      );
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = new URLSearchParams(window.location.hash.slice(1)).get(
      'verify',
    );
    window.history.replaceState(null, '', window.location.pathname);
    if (!token.current) {
      router.replace('/purchases/recover/claim');
      return;
    }
    void verify();
    // Process the private fragment once; never place it in URLs sent to servers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="panel">
      <h1>{busy ? 'Verifying your email…' : 'Unable to verify'}</h1>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!busy && (
        <>
          <button className="secondary" onClick={verify}>
            Try again
          </button>
          <p>
            <Link href="/purchases/recover">
              Request a new verification email
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export function ClaimRecoveredPurchases({
  checkoutEmail,
  accountEmail,
}: {
  checkoutEmail: string;
  accountEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [empty, setEmpty] = useState(false);
  async function claim() {
    setBusy(true);
    setError('');
    try {
      const { claimed } = await api('/api/purchases/recover/claim', {});
      if (!claimed) {
        setEmpty(true);
        setBusy(false);
        return;
      }
      router.replace('/purchases');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not claim purchases.',
      );
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <div className="eyebrow">Checkout email verified</div>
      <h1>Add your purchases</h1>
      <p>
        Find paid guest purchases made with <strong>{checkoutEmail}</strong> and
        save them to <strong>{accountEmail}</strong>.
      </p>
      <p className="hint">
        Saved photos and videos appear together in My purchases. They remain
        accessible when you log in, while the files remain available.
      </p>
      {empty ? (
        <div className="notice" role="status">
          No unclaimed paid purchases matched this email. They may already be
          saved to an account, have been refunded, or use a different checkout
          email.
        </div>
      ) : (
        <button className="primary full" disabled={busy} onClick={claim}>
          {busy ? 'Adding purchases…' : 'Add purchases to my account'}
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p>
        <Link href="/purchases">Open My purchases ↗</Link>
      </p>
      <p>
        <Link href="/purchases/recover">Use another checkout email</Link>
      </p>
    </div>
  );
}
