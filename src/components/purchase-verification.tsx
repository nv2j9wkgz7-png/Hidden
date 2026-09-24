'use client';
import { useId, useState } from 'react';
import { api } from '@/lib/client-api';
import { NavigationLink as Link } from './navigation-link';

export function PurchaseVerification({
  dropId,
  onVerified,
}: {
  dropId: string;
  onVerified: () => void;
}) {
  const id = useId();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendAt, setResendAt] = useState(0);
  async function send() {
    setBusy(true);
    setError('');
    try {
      await api('/api/access/code/request', { drop_id: dropId });
      setSent(true);
      setCode('');
      setResendAt(Date.now() + 60000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to send the code.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/access/code/verify', { drop_id: dropId, code });
      onVerified();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to verify the code.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Verify your purchase">
      <h3>Verify your checkout email</h3>
      <p className="hint">
        We’ll send a code to the email used for this purchase. No account needed
        to view your files.
      </p>
      {sent ? (
        <>
          <p className="notice" role="status">
            Code sent. Check your checkout inbox and spam folder. Enter it here
            within 10 minutes.
          </p>
          <form onSubmit={verify}>
            <div className="field">
              <label htmlFor={id}>6-digit code</label>
              <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/[^0-9]/g, ''))
                }
              />
            </div>
            <button
              className="primary full"
              disabled={busy || code.length !== 6}
            >
              {busy ? 'Verifying…' : 'Verify email'}
            </button>
          </form>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              if (Date.now() < resendAt) {
                setError(
                  'Please wait a minute before requesting another code.',
                );
                return;
              }
              void send();
            }}
          >
            Send a new code
          </button>
        </>
      ) : (
        <button className="primary full" disabled={busy} onClick={send}>
          {busy ? 'Sending…' : 'Email me a code'}
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <p className="hint">
        Keep the code private. Verification does not restart your 72-hour guest
        access.
      </p>
      <p>
        <Link href="/purchases/recover">Need help finding your purchase?</Link>
      </p>
    </section>
  );
}
