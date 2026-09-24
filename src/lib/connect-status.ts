import type Stripe from 'stripe';
export function payoutStatus(account: Stripe.Account) {
  const requirements = account.requirements;
  const ready =
    account.charges_enabled &&
    account.payouts_enabled &&
    account.capabilities?.card_payments === 'active' &&
    account.controller?.fees?.payer === 'account';
  // Pending verification is a Stripe review, not a request to redo onboarding.
  // Outstanding fields still take precedence if another check failed mid-review.
  const needsAttention =
    !!requirements?.currently_due?.length ||
    !!requirements?.past_due?.length ||
    !!requirements?.errors?.length ||
    (!!requirements?.disabled_reason &&
      requirements.disabled_reason !== 'requirements.pending_verification' &&
      requirements.disabled_reason !== 'under_review');
  const underReview =
    !ready &&
    account.details_submitted &&
    !needsAttention &&
    (!!requirements?.pending_verification?.length ||
      requirements?.disabled_reason === 'requirements.pending_verification' ||
      requirements?.disabled_reason === 'under_review' ||
      account.capabilities?.card_payments === 'pending');
  return {
    ready,
    submitted: account.details_submitted,
    needsAttention,
    underReview,
  };
}
