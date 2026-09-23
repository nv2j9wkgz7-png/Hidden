import { earningsEstimate } from '@/lib/fees';
import { money } from '@/lib/format';
export function EarningsEstimate({ cents }: { cents: number }) {
  if (!Number.isSafeInteger(cents) || cents < 50 || cents > 100000) return null;
  const estimate = earningsEstimate(cents);
  return (
    <div className="earnings-estimate">
      <div>
        <span>You receive approximately</span>
        <strong>{money(estimate.net)}</strong>
      </div>
      <small>
        Hidn fee (5%): {money(estimate.platformFee)} · Estimated processing:{' '}
        {money(estimate.processingFee)}
      </small>
      <small>
        Based on US domestic cards (2.9% + 30¢). Actual Stripe fees vary.
      </small>
    </div>
  );
}
