import type Stripe from 'stripe';
export function payoutStatus(account: Stripe.Account) {
  return {
    ready:
      account.charges_enabled &&
      account.payouts_enabled &&
      account.capabilities?.card_payments === 'active' &&
      account.controller?.fees?.payer === 'account',
    submitted: account.details_submitted,
    needsAttention:
      !!account.requirements?.currently_due?.length ||
      !!account.requirements?.disabled_reason,
  };
}
