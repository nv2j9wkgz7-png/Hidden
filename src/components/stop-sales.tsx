'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
export function StopSales({
  dropId,
  status,
  compact = false,
}: {
  dropId: string;
  status: string;
  compact?: boolean;
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
    <section
      className={compact ? 'stop-sales-compact' : 'panel'}
      style={{ marginTop: 24 }}
    >
      {(!compact || status === 'CLOSED') && (
        <h2>{status === 'CLOSED' ? 'Sales stopped' : 'Stop sales'}</h2>
      )}
      {(!compact || status === 'CLOSED') && (
        <p className="hint">
          {status === 'CLOSED'
            ? 'No new purchases can be made. Existing paid buyers keep access to their images.'
            : 'Disable this purchase link and close unpaid checkouts. Buyers who already paid keep access. Payments already completed or processing will still be honored.'}
        </p>
      )}
      {status !== 'CLOSED' &&
        (confirm || status === 'CLOSING' ? (
          <div
            className="stop-confirm"
            role="region"
            aria-label="Confirm stopping sales"
          >
            <h3>Stop sales for this drop?</h3>
            <ul>
              <li>No one new can buy through this link.</li>
              <li>Unpaid checkout links will expire.</li>
              <li>
                Buyers who already paid keep their images and access links.
              </li>
              <li>
                Completed or processing payments are honored. No refunds are
                issued.
              </li>
            </ul>
            <p>
              This drop cannot be reopened for sales. You can create a new drop
              if you want to sell again.
            </p>
            <div className="stop-confirm-actions">
              {status !== 'CLOSING' && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  Keep sales open
                </button>
              )}
              <button className="danger-button" disabled={busy} onClick={stop}>
                {busy
                  ? 'Closing checkouts…'
                  : status === 'CLOSING'
                    ? 'Finish stopping sales'
                    : 'Confirm stop sales'}
              </button>
            </div>
          </div>
        ) : (
          <button className="danger-button" onClick={() => setConfirm(true)}>
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
