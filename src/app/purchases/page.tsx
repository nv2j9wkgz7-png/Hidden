import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { NavigationLink as Link } from '@/components/navigation-link';
import { PurchasedCollection } from '@/components/purchased-collection';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'My purchases' };

export default async function Purchases({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login?next=purchases');
  const page = Math.max(
    1,
    Math.min(100000, Math.floor(Number((await searchParams).page) || 1)),
  );
  const pageSize = 12;
  const db = admin();
  // Only this authenticated buyer's purchases. Never send bearer tokens or storage paths.
  const {
    data: purchases,
    count,
    error,
  } = await db
    .from('purchases')
    .select('id,drop_id,status,paid_at', { count: 'exact' })
    .eq('buyer_id', user.id)
    .in('status', ['PAID', 'REFUNDED'])
    .order('paid_at', { ascending: false })
    .order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const collections = await Promise.all(
    (purchases || []).map(async (purchase) => {
      const { data: drop, error: dropError } = await db
        .from('drops')
        .select('title,slug')
        .eq('id', purchase.drop_id)
        .maybeSingle();
      if (dropError) throw dropError;
      const { data: assets, error: assetError } =
        purchase.status === 'PAID'
          ? await db
              .from('assets')
              .select('id,original_filename,size_bytes,mime_type')
              .eq('drop_id', purchase.drop_id)
              .eq('status', 'READY')
              .order('sort_order')
          : { data: [], error: null };
      if (assetError) throw assetError;
      return { purchase, drop, assets: assets || [] };
    }),
  );
  return (
    <section className="purchase-library">
      <div className="eyebrow">Only yours to see</div>
      <h1>My purchases</h1>
      <p>
        Your purchased photos and videos, together. Saved purchases stay
        accessible when you log in, while the files remain available.
      </p>
      {!count && (
        <div className="panel">
          <h2>Your library starts here.</h2>
          <p>
            After a guest purchase, choose “Save to my account” before its
            72-hour access ends. New purchases made while logged in appear here
            automatically.
          </p>
        </div>
      )}
      {collections.map(({ purchase, drop, assets }) => (
        <section className="purchase-collection" key={purchase.id}>
          <div className="purchase-collection-heading">
            <div>
              <h2>{drop?.title || 'Collection unavailable'}</h2>
              <p className="hint">
                {purchase.paid_at
                  ? new Date(purchase.paid_at).toLocaleDateString('en-US', {
                      timeZone: 'UTC',
                      dateStyle: 'medium',
                    })
                  : ''}{' '}
                · {assets.length} files
              </p>
            </div>
            {purchase.status === 'PAID' && drop && (
              <Link
                className="secondary"
                href={`/d/${drop.slug}?preview=buyer`}
              >
                Download ZIP & more ↗
              </Link>
            )}
          </div>
          {purchase.status === 'REFUNDED' ? (
            <p className="notice">
              This purchase was refunded. Access has ended.
            </p>
          ) : assets.length ? (
            <PurchasedCollection dropId={purchase.drop_id} assets={assets} />
          ) : (
            <p className="notice">These files are no longer available.</p>
          )}
        </section>
      ))}
      <p>
        <Link href="/purchases/recover">
          Missing a guest purchase? Recover it with your checkout email ↗
        </Link>
      </p>
      <nav className="purchase-pagination" aria-label="Purchase pages">
        {page > 1 && (
          <Link className="secondary" href={`/purchases?page=${page - 1}`}>
            ← Newer purchases
          </Link>
        )}
        {(count || 0) > page * pageSize && (
          <Link className="secondary" href={`/purchases?page=${page + 1}`}>
            Older purchases →
          </Link>
        )}
      </nav>
    </section>
  );
}
