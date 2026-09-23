import Link from 'next/link';
import { after } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/welcome';
import { redirect } from 'next/navigation';
import {
  Images,
  ShoppingBag,
  DollarSign,
  ListFilter,
  Check,
} from 'lucide-react';
import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { CopyButton } from '@/components/copy-button';
export const dynamic = 'force-dynamic';
const sortOptions = [
  {
    value: 'revenue-high',
    label: 'Revenue: high to low',
    column: 'created_at',
    ascending: false,
  },
  {
    value: 'revenue-low',
    label: 'Revenue: low to high',
    column: 'created_at',
    ascending: true,
  },
  {
    value: 'newest',
    label: 'Date: newest first',
    column: 'created_at',
    ascending: false,
  },
  {
    value: 'oldest',
    label: 'Date: oldest first',
    column: 'created_at',
    ascending: true,
  },
  {
    value: 'price-low',
    label: 'Price: low to high',
    column: 'price_cents',
    ascending: true,
  },
  {
    value: 'price-high',
    label: 'Price: high to low',
    column: 'price_cents',
    ascending: false,
  },
];
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const requested = (await searchParams).sort;
  const sort =
    sortOptions.find((option) => option.value === requested) ||
    sortOptions.find((option) => option.value === 'newest')!;
  if (!configured()) return <Setup />;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  if (user.email) {
    const email = user.email;
    after(async () => {
      try {
        await sendWelcomeEmail(user.id, email);
      } catch {
        // Keep account access independent of email delivery; retry on next visit.
        console.error(
          'Welcome email delivery failed; retry on next dashboard visit.',
        );
      }
    });
  }
  const db = admin();
  const revenueSort = sort.value.startsWith('revenue-');
  const [{ data: drops, error }, { data: stats, error: statsError }] =
    await Promise.all([
      revenueSort
        ? Promise.resolve({ data: null, error: null })
        : db
            .from('drops')
            .select(
              'id,title,slug,price_cents,status,created_at,assets(id,preview_path)',
            )
            .eq('creator_id', user.id)
            .order(sort.column, { ascending: sort.ascending })
            .order('id', { ascending: true })
            .limit(100),
      db.rpc('creator_stats', { p_creator: user.id }),
    ]);
  if (error || statsError)
    throw new Error('Could not load your drops. Check the database migration.');
  const rows = (stats || []) as {
    drop_id: string;
    sales: number;
    gross_cents: number;
  }[];
  let displayedDrops = drops || [];
  if (revenueSort) {
    const ranked = [...rows]
      .sort(
        (a, b) =>
          (Number(a.gross_cents) - Number(b.gross_cents)) *
            (sort.ascending ? 1 : -1) || a.drop_id.localeCompare(b.drop_id),
      )
      .slice(0, 100);
    if (ranked.length) {
      const { data, error } = await db
        .from('drops')
        .select(
          'id,title,slug,price_cents,status,created_at,assets(id,preview_path)',
        )
        .eq('creator_id', user.id)
        .in(
          'id',
          ranked.map((row) => row.drop_id),
        );
      if (error) throw new Error('Could not sort your drops by revenue.');
      const rank = new Map(ranked.map((row, index) => [row.drop_id, index]));
      displayedDrops = (data || []).sort(
        (a, b) => rank.get(a.id)! - rank.get(b.id)!,
      );
    }
  }
  const totalSales = rows.reduce((n, r) => n + Number(r.sales), 0),
    gross = rows.reduce((n, r) => n + Number(r.gross_cents), 0);
  return (
    <>
      <div className="page-heading studio-heading">
        <div>
          <div className="eyebrow">Your private gallery</div>
          <h1>Your drops</h1>
          <p>Made by you. Unlocked by them.</p>
        </div>
        <div className="studio-art" aria-hidden="true">
          <img src="/hidn-arrow-mark.svg" alt="" width={180} height={180} />
        </div>
      </div>
      <div className="stats">
        {[
          ['Total drops', rows.length, Images],
          ['Total sales', totalSales, ShoppingBag],
          ['Gross revenue', money(gross), DollarSign],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Images;
          return (
            <div className="stat" key={String(label)}>
              <div className="stat-label">
                {String(label)}
                <I size={17} />
              </div>
              <div className="stat-value">{String(value)}</div>
            </div>
          );
        })}
      </div>
      <div className="section-title">
        <h2>
          All drops{' '}
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>
            {' '}
            / {displayedDrops.length}
          </span>
        </h2>
        <details className="drop-sort" key={sort.value}>
          <summary aria-label={`Sort drops. ${sort.label}`} title="Sort drops">
            <ListFilter size={23} />
          </summary>
          <div className="drop-sort-options">
            <span className="hint">Sort by</span>
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard?sort=${option.value}`}
                scroll={false}
                aria-current={sort.value === option.value ? 'true' : undefined}
              >
                {option.label}
                {sort.value === option.value && <Check size={16} />}
              </Link>
            ))}
          </div>
        </details>
      </div>
      <div className="drop-grid">
        <Link
          href="/new"
          className="drop-card create-drop-card"
          aria-label="Create a new drop"
        >
          <span className="create-drop-plus" aria-hidden="true">
            <img src="/hidn-ribbon-plus.svg" alt="" width={90} height={90} />
          </span>
          <strong>New drop</strong>
          <span className="hint">Upload images. Set a price. Share.</span>
        </Link>
        {displayedDrops.map((drop) => {
          const stat = rows.find((r) => r.drop_id === drop.id);

          const cover = drop.assets.find((a) => a.preview_path)?.preview_path;
          return (
            <article className="drop-card" key={drop.id}>
              <Link
                className="drop-cover private-drop-cover"
                href={
                  drop.status !== 'DRAFT'
                    ? `/dashboard/drops/${drop.slug}/share`
                    : `/new?drop=${drop.id}`
                }
                aria-label={`Open ${drop.title}`}
              >
                {cover && (
                  <img
                    className="private-drop-background"
                    src={
                      db.storage.from('previews').getPublicUrl(cover).data
                        .publicUrl
                    }
                    alt=""
                  />
                )}
                <img
                  src="/hidn-arrow-mark.svg"
                  alt=""
                  className="private-drop-mark"
                  width={56}
                  height={64}
                />
                <span className="private-drop-label">Open to view images</span>
                <span
                  className={`badge ${drop.status !== 'DRAFT' ? 'paid' : ''}`}
                >
                  {drop.status !== 'DRAFT'
                    ? drop.status === 'PUBLISHED'
                      ? 'Live'
                      : 'Sales stopped'
                    : 'Draft'}
                </span>
              </Link>
              <div className="drop-info">
                <h3>{drop.title}</h3>
                <span className="hint">
                  {drop.assets.length} images · {money(drop.price_cents)}
                </span>
                <div className="row">
                  <span>{stat?.sales || 0} sales</span>
                  <strong>{money(Number(stat?.gross_cents || 0))}</strong>
                </div>
                <div className="card-actions">
                  {drop.status !== 'DRAFT' ? (
                    <>
                      <Link href={`/dashboard/drops/${drop.slug}/share`}>
                        Open drop ↗
                      </Link>
                      <Link href={`/dashboard/drops/${drop.slug}/manage`}>
                        Manage
                      </Link>
                      <CopyButton path={`/d/${drop.slug}`} />
                    </>
                  ) : (
                    <Link href={`/new?drop=${drop.id}`}>Continue draft →</Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hint" style={{ marginTop: 20 }}>
        Sales count purchases, not individual images. Gross revenue is before
        fees and refunds. Showing up to 100 drops in your selected order.
      </p>
    </>
  );
}
