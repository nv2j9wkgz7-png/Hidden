'use client';
import { useState } from 'react';
export function PayoutAction({
  action,
  children,
  needsCountry = false,
}: {
  action: 'onboard' | 'dashboard';
  needsCountry?: boolean;
  children: React.ReactNode;
}) {
  const [country, setCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/creator/payouts/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(country ? { country } : {}),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Unable to open payout settings.');
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
      setBusy(false);
    }
  }
  return (
    <div className="payout-action">
      {needsCountry && (
        <label className="payout-country">
          Business country
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Select your country</option>
            <option value="US">United States</option>
          </select>
          <span className="hint">
            Payout setup is currently available for US creators.
          </span>
        </label>
      )}
      <button
        className="button payout-action-button"
        disabled={busy || (needsCountry && !country)}
        onClick={open}
      >
        {busy ? 'Opening Stripe…' : children}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
