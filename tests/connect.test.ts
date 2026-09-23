import test from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { payoutStatus } from '../src/lib/connect-status';
test('payout eligibility requires charges, payouts and active card payments with creator-paid fees', () => {
  const enabled = {
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    capabilities: { card_payments: 'active' },
    controller: { fees: { payer: 'account' } },
    requirements: { currently_due: [], disabled_reason: null },
  } as unknown as Stripe.Account;
  assert.equal(payoutStatus(enabled).ready, true);
  for (const patch of [
    { charges_enabled: false },
    { payouts_enabled: false },
    { capabilities: { card_payments: 'pending' } },
    { controller: { fees: { payer: 'application' } } },
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

import { hidnFee, earningsEstimate } from '../src/lib/fees';
test('5% fee uses integer cents and processing estimates remain separate', () => {
  assert.equal(hidnFee(2500), 125);
  assert.equal(hidnFee(50), 3);
  assert.equal(hidnFee(100000), 5000);
  assert.deepEqual(earningsEstimate(2500), {
    platformFee: 125,
    processingFee: 103,
    net: 2272,
  });
  for (const invalid of [NaN, -1, 49, 100001, 500.5])
    assert.throws(() => hidnFee(invalid));
});
