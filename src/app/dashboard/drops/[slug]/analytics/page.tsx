import { notFound, redirect } from 'next/navigation';
import { NavigationLink as Link } from '@/components/navigation-link';
import { admin } from '@/lib/supabase/admin';
import { supabase } from '@/lib/supabase/server';
import {
  analyticsPeriod,
  checkoutConversion,
  type DropAnalytics,
} from '@/lib/analytics';
import { money } from '@/lib/format';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Drop analytics' };
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  const { slug } = await params;
  if (!/^[a-f0-9]{24}$/.test(slug)) notFound();
  const days = analyticsPeriod((await searchParams).days);
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id,title,status')
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  const { data, error: statsError } = await db.rpc('drop_analytics', {
    p_creator: user.id,
    p_drop: drop.id,
    p_days: days,
  });
  if (statsError) throw statsError;
  const stats = data as DropAnalytics;
  const peak = Math.max(
    1,
    ...stats.daily.map((d) => Math.max(d.views, d.checkouts)),
  );
  const date = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  return (
    <div className="drop-analytics">
      <Link restoreScroll className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="page-heading analytics-heading">
        <div>
          <div className="eyebrow">Private insights</div>
          <h1>Drop analytics</h1>
          <p>{drop.title}</p>
        </div>
        <div className="analytics-header-actions">
          <img
            src="/hidn-analytics-ribbon.svg"
            width={168}
            height={108}
            alt=""
            aria-hidden="true"
          />
          <Link
            className="button secondary"
            href={`/dashboard/drops/${slug}/share`}
          >
            Open drop ↗
          </Link>
        </div>
      </div>
      <nav className="analytics-periods" aria-label="Analytics period">
        {[7, 30, 90].map((n) => (
          <Link
            key={n}
            href={`?days=${n}`}
            scroll={false}
            aria-current={days === n ? 'page' : undefined}
          >
            Last {n} days
          </Link>
        ))}
      </nav>
      <div className="stats analytics-stats">
        {[
          ['Views', stats.views],
          ['Checkout starts', stats.checkouts],
          ['Purchases', stats.purchases],
          [
            'Checkout conversion',
            checkoutConversion(stats.purchases, stats.checkouts),
          ],
        ].map(([label, value]) => (
          <div className="stat" key={label}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
      {!stats.views && !stats.checkouts && (
        <p className="notice">
          {drop.status === 'DRAFT'
            ? 'Publish and share your drop to start seeing activity.'
            : 'No activity recorded in this period yet. Share your drop to get started.'}
        </p>
      )}
      <section className="panel analytics-chart">
        <div className="section-title">
          <h2>Activity</h2>
          <span className="hint">Daily · UTC</span>
        </div>
        <p className="analytics-legend">
          <span>● Views</span>
          <span>● Checkout starts</span>
        </p>
        <div
          className="analytics-bars"
          role="img"
          aria-label={`${stats.views} views and ${stats.checkouts} checkout starts over the last ${days} days. Daily values are in the table below.`}
        >
          {stats.daily.map((d) => (
            <div
              className="analytics-day"
              key={d.day}
              title={`${date(d.day)}: ${d.views} views, ${d.checkouts} checkout starts`}
            >
              <span style={{ height: `${(d.views / peak) * 100}%` }} />
              <span style={{ height: `${(d.checkouts / peak) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="analytics-axis">
          <span>{date(stats.daily[0].day)}</span>
          <span>{date(stats.daily[stats.daily.length - 1].day)}</span>
        </div>
        <details className="analytics-table">
          <summary>View daily numbers</summary>
          <div className="analytics-table-scroll">
            <table>
              <caption>Activity by checkout start date · UTC</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Views</th>
                  <th scope="col">Checkouts</th>
                  <th scope="col">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {stats.daily.map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{date(d.day)}</th>
                    <td>{d.views}</td>
                    <td>{d.checkouts}</td>
                    <td>{d.purchases}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="panel analytics-notes">
        <h2>{money(stats.gross_cents)} in sales</h2>
        <p>
          Paid purchases from checkouts started in this period, before
          processing and platform fees. Fully refunded purchases are excluded;
          partial refunds are not deducted here. This is not your payout
          balance.
        </p>
        <details>
          <summary>How these numbers work</summary>
          <p>
            Views count visible visits once per browser tab, per drop, per UTC
            day. Reloads in the same tab don’t add views. Signed-in creator
            visits and known bots are excluded. Views are estimates, not unique
            people, and start with the analytics launch; older view counts are
            unavailable.
          </p>
          <p>
            Checkout starts count payment sessions successfully created,
            including abandoned checkouts. Returning to the same session doesn’t
            add another start. Purchases count those checkouts that are now
            paid, excluding full refunds. Conversion is purchases divided by
            checkout starts, so a later payment or refund can update earlier
            days.
          </p>
          <p>
            No visitor names, emails, IP addresses, or browsing profiles appear
            here. View tracking uses a random per-drop tab identifier and stores
            only aggregate counts plus short-lived duplicate-prevention hashes.
          </p>
        </details>
      </section>
    </div>
  );
}
