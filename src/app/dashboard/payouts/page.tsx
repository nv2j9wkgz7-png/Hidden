import { NavigationLink as Link } from '@/components/navigation-link';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import {
  connectLiveMode,
  connectStripe,
  creatorPayoutAccount,
} from '@/lib/connect';
import { payoutStatus } from '@/lib/connect-status';
import { PayoutAction } from '@/components/payout-action';
export const dynamic = 'force-dynamic';
const amount = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    value / 100,
  );
export default async function Payouts({
  searchParams,
}: {
  searchParams: Promise<{ refresh?: string; returned?: string }>;
}) {
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  const params = await searchParams;
  const accountId = await creatorPayoutAccount(user.id);
  const stripe = connectStripe();
  const account = accountId ? await stripe.accounts.retrieve(accountId) : null;
  const status = account ? payoutStatus(account) : null;
  const balances = accountId
    ? await stripe.balance.retrieve({}, { stripeAccount: accountId })
    : null;
  const payouts = accountId
    ? await stripe.payouts.list({ limit: 10 }, { stripeAccount: accountId })
    : null;
  const testMode = !connectLiveMode();
  return (
    <div className="payout-page">
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Made by you. Paid to you.</div>
          <h1>Earnings & payouts</h1>
          <p>
            Free to start. Hidn takes 5% when you sell. Payment processing fees
            apply.
          </p>
        </div>
      </div>
      {testMode && (
        <p className="payout-test" role="status">
          Test mode — these balances and payouts use test money.
        </p>
      )}
      <section className="panel payout-setup">
        <img src="/hidn-arrow-mark.svg" width={64} height={72} alt="" />
        <div>
          <h2>
            {status?.ready
              ? 'Your payouts are connected'
              : status?.underReview
                ? 'Stripe is reviewing your details'
                : account
                  ? 'Finish setting up payouts'
                  : 'Where should we send your earnings?'}
          </h2>
          <p>
            {status?.ready
              ? 'Available funds are paid to your connected bank on your Stripe payout schedule.'
              : status?.underReview
                ? 'Your setup is submitted. Stripe is verifying your details; no additional information is currently requested. Payments will become available once Stripe enables your account.'
                : 'Connect your bank and verify your details securely with Stripe. Hidn never stores your bank details.'}
          </p>
          {params.refresh && (
            <p role="status">
              Your setup link expired. Continue below to get a new one.
            </p>
          )}
          {params.returned && !status?.ready && (
            <p role="status">
              You’re back in Hidn. Payouts will be ready once Stripe confirms
              your details.
            </p>
          )}
          <PayoutAction
            needsCountry={!account}
            action={
              status?.ready || status?.underReview ? 'dashboard' : 'onboard'
            }
          >
            {status?.ready
              ? 'Manage payouts ↗'
              : status?.underReview
                ? 'View Stripe status ↗'
                : account
                  ? 'Continue setup ↗'
                  : 'Set up payouts ↗'}
          </PayoutAction>
        </div>
      </section>
      {balances && (
        <>
          <div className="stats payout-balances">
            <div className="stat">
              <div className="stat-label">Available for payout</div>
              <div className="stat-value">
                {balances.available.map((b) => (
                  <div key={b.currency}>{amount(b.amount, b.currency)}</div>
                ))}
              </div>
              <p className="hint">Funds available in your Stripe balance.</p>
            </div>
            <div className="stat">
              <div className="stat-label">Pending earnings</div>
              <div className="stat-value">
                {balances.pending.map((b) => (
                  <div key={b.currency}>{amount(b.amount, b.currency)}</div>
                ))}
              </div>
              <p className="hint">Payments still clearing before payout.</p>
            </div>
          </div>
          <section className="panel">
            <h2>Recent payouts</h2>
            {payouts?.data.length ? (
              <ul className="payout-history">
                {payouts.data.map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{amount(p.amount, p.currency)}</strong>
                      <span>
                        {p.status === 'paid' ? 'Arrival' : 'Expected arrival'} ·{' '}
                        {new Date(p.arrival_date * 1000).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC',
                          },
                        )}
                      </span>
                    </div>
                    <span
                      className={`badge ${p.status === 'paid' ? 'paid' : ''}`}
                    >
                      {p.status.replaceAll('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Your payouts will appear here once Stripe sends funds to your
                bank.
              </p>
            )}
          </section>
        </>
      )}
      <p className="hint">
        Sales totals and available funds can differ because of fees, refunds,
        and payment clearing times.
      </p>
    </div>
  );
}
