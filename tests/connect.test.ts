import test from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { payoutStatus } from '../src/lib/connect-status';
test('payout eligibility requires charges, payouts and active transfers', () => {
  const enabled = {
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    capabilities: { transfers: 'active' },
    requirements: { currently_due: [], disabled_reason: null },
  } as unknown as Stripe.Account;
  assert.equal(payoutStatus(enabled).ready, true);
  for (const patch of [
    { charges_enabled: false },
    { payouts_enabled: false },
    { capabilities: { transfers: 'pending' } },
    { capabilities: {} },
  ]) {
    assert.equal(
      payoutStatus({ ...enabled, ...patch } as Stripe.Account).ready,
      false,
    );
  }
  assert.equal(
    payoutStatus({
      ...enabled,
      requirements: { currently_due: ['external_account'] },
    } as Stripe.Account).needsAttention,
    true,
  );
});
