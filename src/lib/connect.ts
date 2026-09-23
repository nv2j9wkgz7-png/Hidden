import 'server-only';
import Stripe from 'stripe';
import { admin } from './supabase/admin';
import { env, appUrl } from './env';
import { HttpError } from './http';
import { payoutStatus } from './connect-status';
export function connectStripe() {
  return new Stripe(env('STRIPE_SECRET_KEY'), { maxNetworkRetries: 2 });
}
export function connectLiveMode() {
  return (
    !env('STRIPE_SECRET_KEY').startsWith('sk_test_') &&
    !env('STRIPE_SECRET_KEY').startsWith('rk_test_')
  );
}
export async function creatorPayoutAccount(userId: string) {
  const { data, error } = await admin()
    .from('creator_payout_accounts')
    .select('stripe_account_id')
    .eq('creator_id', userId)
    .eq('livemode', connectLiveMode())
    .maybeSingle();
  if (error) throw error;
  return data?.stripe_account_id as string | undefined;
}
export async function createOnboarding(
  user: { id: string; email?: string },
  country?: 'US',
) {
  const stripe = connectStripe();
  let accountId = await creatorPayoutAccount(user.id);
  if (!accountId) {
    if (!country) throw new HttpError(400, 'Select your business country.');
    const account = await stripe.v2.core.accounts.create(
      {
        dashboard: 'full',
        identity: { country: country.toLowerCase() },
        ...(user.email ? { contact_email: user.email } : {}),
        configuration: {
          merchant: { capabilities: { card_payments: { requested: true } } },
        },
        defaults: {
          currency: 'usd',
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
          profile: {
            product_description:
              'Original digital image collections sold through Hidn',
          },
        },
        metadata: { hidn_creator_id: user.id },
      },
      { idempotencyKey: `hidn-connect:${connectLiveMode()}:${user.id}` },
    );
    const { error } = await admin().from('creator_payout_accounts').upsert(
      {
        creator_id: user.id,
        livemode: connectLiveMode(),
        stripe_account_id: account.id,
      },
      { onConflict: 'creator_id,livemode', ignoreDuplicates: true },
    );
    if (error) throw error;
    // Read the winning account if two onboarding requests raced.
    accountId = await creatorPayoutAccount(user.id);
  }
  if (!accountId) throw new Error('Payout account could not be saved');
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant'],
        refresh_url: `${appUrl()}/dashboard/payouts?refresh=1`,
        return_url: `${appUrl()}/dashboard/payouts?returned=1`,
      },
    },
  });
  return link.url;
}
export async function payoutDashboard(userId: string) {
  const accountId = await creatorPayoutAccount(userId);
  if (!accountId) throw new HttpError(409, 'Set up payouts first.');
  const stripe = connectStripe();
  const account = await stripe.accounts.retrieve(accountId);
  if (!payoutStatus(account).submitted)
    throw new HttpError(409, 'Finish payout setup first.');
  return 'https://dashboard.stripe.com/';
}

export async function readyPayoutAccount(userId: string) {
  const id = await creatorPayoutAccount(userId);
  if (!id) return null;
  const account = await connectStripe().accounts.retrieve(id);
  return payoutStatus(account).ready ? id : null;
}
