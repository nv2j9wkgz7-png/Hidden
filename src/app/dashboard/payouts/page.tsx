import { NavigationLink as Link } from '@/components/navigation-link';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import {
  connectLiveMode,
  connectStripe,
  creatorPayoutAccount,
} from '@/lib/connect';
import { payoutStatus } from '@/lib/connect-status';
import {
  ArrowLeft,
  ShieldCheck,
  Landmark,
  BadgeCheck,
  Wallet,
  ArrowDownLeft,
  Clock3,
} from 'lucide-react';
import { CollectionArtwork } from '@/components/utility-art';
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
  const identityDocumentRequired = account?.requirements?.currently_due?.some(
    (field) => field.startsWith('individual.verification.document'),
  );
  const balances = accountId
    ? await stripe.balance.retrieve({}, { stripeAccount: accountId })
    : null;
  const payouts = accountId
    ? await stripe.payouts.list({ limit: 10 }, { stripeAccount: accountId })
    : null;
  const testMode = !connectLiveMode();
  return (
    <div className="payout-page utility-page">
      <Link className="utility-back" href="/dashboard">
        <ArrowLeft size={16} /> My drops
      </Link>
      <header className="utility-heading">
        <div>
          <div className="eyebrow">Your earnings</div>
          <h1>
            Earnings & payouts<span className="heading-dot">.</span>
          </h1>
          <p>
            Free to start. Hidn takes 5% when you sell. Payment processing fees
            apply.
          </p>
        </div>
      </header>
      {testMode && (
        <p className="payout-test" role="status">
          <span className="utility-status-dot" aria-hidden="true" />
          <strong>Test mode</strong>
          <span>Balances and payouts use test money.</span>
        </p>
      )}
      <div className="payout-layout">
        <section className="panel payout-setup utility-surface">
          <div className="payout-setup-icon" aria-hidden="true">
            {status?.ready ? (
              <BadgeCheck size={26} />
            ) : status?.underReview ? (
              <Clock3 size={26} />
            ) : (
              <Landmark size={26} />
            )}
          </div>
          <div className="payout-setup-copy">
            <span className="eyebrow">
              {status?.ready
                ? 'Connected'
                : status?.underReview
                  ? 'Under review'
                  : 'Your next step'}
            </span>
            <h2>
              {status?.ready
                ? 'Your payouts are connected'
                : status?.underReview
                  ? 'Stripe is reviewing your details'
                  : identityDocumentRequired
                    ? 'Stripe needs identity verification'
                    : account
                      ? 'Finish setting up payouts'
                      : 'Give your earnings a home.'}
            </h2>
            <p>
              {status?.ready
                ? 'Available funds are paid to your connected bank on your Stripe payout schedule.'
                : status?.underReview
                  ? 'Your setup is submitted. Stripe is verifying your details; no additional information is currently requested. Payments will become available once Stripe enables your account.'
                  : identityDocumentRequired
                    ? 'Your setup was submitted, but Stripe still needs an identity document before payments can be enabled. Continue in Stripe to resolve this verification step.'
                    : 'Connect your bank and verify your details securely with Stripe. Hidn never stores your bank details.'}
            </p>
            {testMode && identityDocumentRequired && (
              <p className="hint">
                This is a sandbox account. Use{' '}
                <a
                  href="https://docs.stripe.com/connect/testing#test-document-images"
                  target="_blank"
                  rel="noreferrer"
                >
                  Stripe’s test identity documents
                </a>{' '}
                for testing instead of uploading your real ID.
              </p>
            )}
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
        <aside className="payout-explainer">
          <CollectionArtwork compact />
          <h2>From your work to your bank.</h2>
          <ol className="payout-steps">
            <li>
              <span>
                <BadgeCheck size={17} />
              </span>
              <div>
                <strong>Verify your details</strong>
                <p>Complete the required checks with Stripe.</p>
              </div>
            </li>
            <li>
              <span>
                <Landmark size={17} />
              </span>
              <div>
                <strong>Connect your bank</strong>
                <p>Choose where your payouts arrive.</p>
              </div>
            </li>
            <li>
              <span>
                <Wallet size={17} />
              </span>
              <div>
                <strong>Receive your earnings</strong>
                <p>Available funds follow your payout schedule.</p>
              </div>
            </li>
          </ol>
          <p className="utility-privacy">
            <ShieldCheck size={16} /> Bank details are handled by Stripe.
          </p>
        </aside>
      </div>
      {balances && (
        <>
          <div className="stats payout-balances utility-balances">
            <div className="stat">
              <div className="stat-label">
                <ArrowDownLeft size={16} /> Available for payout
              </div>
              <div className="stat-value">
                {balances.available.map((b) => (
                  <div key={b.currency}>{amount(b.amount, b.currency)}</div>
                ))}
              </div>
              <p className="hint">Funds available in your Stripe balance.</p>
            </div>
            <div className="stat">
              <div className="stat-label">
                <Clock3 size={16} /> Pending earnings
              </div>
              <div className="stat-value">
                {balances.pending.map((b) => (
                  <div key={b.currency}>{amount(b.amount, b.currency)}</div>
                ))}
              </div>
              <p className="hint">Payments still clearing before payout.</p>
            </div>
          </div>
          <section className="panel payout-history-panel">
            <div className="utility-section-heading">
              <h2>Recent payouts</h2>
              <span className="utility-label">Last 10 transfers</span>
            </div>
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
              <p className="payout-history-empty">
                <Wallet size={24} aria-hidden="true" /> Your payouts will appear
                here once Stripe sends funds to your bank.
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
