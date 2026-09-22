import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Images, ShoppingBag, DollarSign, Plus } from 'lucide-react';
import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { money } from '@/lib/format';
import { CopyButton } from '@/components/copy-button';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  if (!configured()) return <Setup />;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  const db = admin();
  const [{ data: drops, error }, { data: stats, error: statsError }] =
    await Promise.all([
      db
        .from('drops')
        .select(
          'id,title,slug,price_cents,status,created_at,assets(preview_path)',
        )
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
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
  const totalSales = rows.reduce((n, r) => n + Number(r.sales), 0),
    gross = rows.reduce((n, r) => n + Number(r.gross_cents), 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Creator workspace</div>
          <h1>Your drops</h1>
          <p>A little less admin. A little more creating.</p>
        </div>
        <Link className="button" href="/new">
          <Plus size={17} /> New drop
        </Link>
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
            / {drops?.length || 0}
          </span>
        </h2>
        <span className="hint">Newest first</span>
      </div>
      {!drops?.length ? (
        <section className="panel empty">
          <div className="empty-icon">
            <Images size={28} />
          </div>
          <h2>Your next handoff starts here.</h2>
          <p>
            Upload your images, set a price, and give your buyer one simple
            link.
          </p>
          <Link href="/new" className="button">
            Create a drop <Plus size={16} />
          </Link>
        </section>
      ) : (
        <div className="drop-grid">
          {drops.map((drop) => {
            const stat = rows.find((r) => r.drop_id === drop.id);
            const cover = drop.assets.find((a) => a.preview_path)?.preview_path;
            return (
              <article className="drop-card" key={drop.id}>
                <div className="drop-cover">
                  {cover ? (
                    <img
                      src={
                        db.storage.from('previews').getPublicUrl(cover).data
                          .publicUrl
                      }
                      alt="Locked drop preview"
                    />
                  ) : (
                    <Images size={32} color="#958bac" />
                  )}
                  <span
                    className={`badge ${drop.status === 'PUBLISHED' ? 'paid' : ''}`}
                  >
                    {drop.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                  </span>
                </div>
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
                    {drop.status === 'PUBLISHED' ? (
                      <>
                        <Link href={`/dashboard/drops/${drop.slug}/share`}>
                          Share drop ↗
                        </Link>
                        <CopyButton path={`/d/${drop.slug}`} />
                      </>
                    ) : (
                      <Link href={`/new?drop=${drop.id}`}>
                        Continue draft →
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="hint" style={{ marginTop: 20 }}>
        Sales count purchases, not individual images. Gross revenue is before
        fees and refunds. Showing your latest 100 drops.
      </p>
      <form className="logout" action="/auth/logout" method="post">
        <button>Log out</button>
      </form>
    </>
  );
}
