import { ChevronDown } from 'lucide-react';
import { earningsEstimate } from '@/lib/fees';
import { money } from '@/lib/format';
export function EarningsEstimate({ cents }: { cents: number }) {
  if (!Number.isSafeInteger(cents) || cents < 50 || cents > 100000) return null;
  const estimate = earningsEstimate(cents);
  return (
    <details className="earnings-estimate earnings-disclosure">
      <summary>
        <span className="earnings-label">
          You earn <small>Estimated per sale</small>
        </span>
        <strong>{money(estimate.net)}</strong>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="fee-breakdown">
        <div>
          <span>Hidn fee · 5%</span>
          <span>{money(estimate.platformFee)}</span>
        </div>
        <div>
          <span>Est. processing</span>
          <span>{money(estimate.processingFee)}</span>
        </div>
        <small>US domestic cards: 2.9% + 30¢. Actual Stripe fees vary.</small>
      </div>
    </details>
  );
}
