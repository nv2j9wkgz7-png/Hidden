import { ChevronDown } from 'lucide-react';
import { earningsEstimate } from '@/lib/fees';
import { money } from '@/lib/format';
export function EarningsEstimate({ cents }: { cents: number }) {
  if (!Number.isSafeInteger(cents) || cents < 50 || cents > 100000) return null;
  const estimate = earningsEstimate(cents);
  return (
    <details className="earnings-estimate earnings-disclosure">
      <summary>
        <span>Est. earnings</span>
        <strong>{money(estimate.net)}</strong>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="fee-breakdown">
        <small>Hidn fee (5%): {money(estimate.platformFee)}</small>
        <small>Estimated processing: {money(estimate.processingFee)}</small>
        <small>US domestic cards: 2.9% + 30¢. Actual Stripe fees vary.</small>
      </div>
    </details>
  );
}
