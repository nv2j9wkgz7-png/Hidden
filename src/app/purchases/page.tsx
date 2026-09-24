import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { NavigationLink as Link } from '@/components/navigation-link';
import { CollectionArtwork } from '@/components/utility-art';
import { ArrowUpRight, LockKeyhole, Mail, Images } from 'lucide-react';
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
        .select('title,slug,moderation_state')
        .eq('id', purchase.drop_id)
        .maybeSingle();
      if (dropError) throw dropError;
      const { data: assets, error: assetError } =
        purchase.status === 'PAID' && drop?.moderation_state !== 'REMOVED'
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
    <section className="purchase-library utility-page">
      <header className="utility-heading library-heading">
        <div>
          <div className="eyebrow">Your private library</div>
          <h1>
            My purchases<span className="heading-dot">.</span>
          </h1>
          <p>Your photos and videos, all in one place.</p>
        </div>
        <span className="utility-label">
          <LockKeyhole size={14} /> Only you can see this
        </span>
      </header>
      {!count ? (
        <section className="library-empty utility-surface">
          <CollectionArtwork />
          <div className="library-empty-copy">
            <span className="eyebrow">A little space for what’s yours</span>
            <h2>A place for your purchases.</h2>
            <p>
              Bought a drop as a guest? Bring it into your library with your
              checkout email.
            </p>
            <Link className="button" href="/purchases/recover">
              Recover a purchase <ArrowUpRight size={17} />
            </Link>
            <Link className="utility-text-link" href="/help#access">
              How saving purchases works <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : (
        <div className="library-toolbar">
          <span>
            <Images size={17} /> {count} saved{' '}
            {count === 1 ? 'collection' : 'collections'}
          </span>
          <Link href="/purchases/recover">
            Missing a purchase? <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      {!!count && !collections.length && (
        <p className="notice">
          No purchases on this page.{' '}
          <Link href="/purchases">Return to your library</Link>.
        </p>
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
            {purchase.status === 'PAID' &&
              drop &&
              drop.moderation_state !== 'REMOVED' && (
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
      <div className="library-notes">
        <p>
          <LockKeyhole size={16} />
          <span>
            Saved purchases remain here while the files are available. Log in on
            any device to return.
          </span>
        </p>
        <p>
          <Mail size={16} />
          <span>
            Buying while logged in saves your purchase automatically. Guest
            purchases need checkout-email verification.
          </span>
        </p>
      </div>
      {(page > 1 || (count || 0) > page * pageSize) && (
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
      )}
    </section>
  );
}
