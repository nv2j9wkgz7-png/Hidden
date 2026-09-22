'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
export function StopSales({
  dropId,
  status,
}: {
  dropId: string;
  status: string;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  async function stop() {
    setBusy(true);
    setError('');
    try {
      await api('/api/creator/stop-sales', { drop_id: dropId });
      router.refresh();
      setConfirm(false);
    } catch {
      setError(
        'Could not finish closing checkouts. Retry to ensure all unpaid checkout links are expired.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h2>{status === 'CLOSED' ? 'Sales stopped' : 'Stop sales'}</h2>
      <p className="hint">
        {status === 'CLOSED'
          ? 'No new purchases can be made. Existing paid buyers keep access to their images.'
          : 'Disable this purchase link and close unpaid checkouts. Buyers who already paid keep access. Payments already completed or processing will still be honored.'}
      </p>
      {status !== 'CLOSED' &&
        (confirm || status === 'CLOSING' ? (
          <>
            <p>Stop accepting payments for this drop?</p>
            <button className="secondary" disabled={busy} onClick={stop}>
              {busy ? 'Closing checkouts…' : 'Stop sales now'}
            </button>
            {status !== 'CLOSING' && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            )}
          </>
        ) : (
          <button className="secondary" onClick={() => setConfirm(true)}>
            Stop sales
          </button>
        ))}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </section>
  );
}
