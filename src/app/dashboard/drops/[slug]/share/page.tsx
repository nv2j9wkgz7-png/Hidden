import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check, Images } from 'lucide-react';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { appUrl, configured } from '@/lib/env';
import { money, fileSize } from '@/lib/format';
import { Setup } from '@/components/setup';
import { StopSales } from '@/components/stop-sales';
import { ShareDrop } from '@/components/share-drop';

export const dynamic = 'force-dynamic';
export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!configured()) return <Setup />;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  const { slug } = await params;
  if (!/^[a-f0-9]{24}$/.test(slug)) notFound();
  const { data: drop, error } = await admin()
    .from('drops')
    .select(
      'id,status,title,price_cents,assets(id,size_bytes,storage_path,original_filename,status,sort_order)',
    )
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  // Ownership was verified above; only this creator page may receive original URLs.
  const originals = await Promise.all(
    drop.assets
      .filter((a) => a.status === 'READY')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(async (asset) => {
        const { data, error } = await admin()
          .storage.from('originals')
          .createSignedUrl(asset.storage_path, 60);
        if (error) throw error;
        return {
          id: asset.id,
          name: asset.original_filename,
          size: asset.size_bytes,
          url: data.signedUrl,
        };
      }),
  );
  return (
    <div className="share-page">
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="share-heading">
        <div className="share-check">
          <Check size={28} />
        </div>
        <div className="eyebrow">02 / Share</div>
        <h1>Your drop is ready.</h1>
        <p>Send the link. Your buyers preview, pay, and unlock.</p>
      </div>
      <section className="panel creator-gallery-panel">
        <h2>Your uploaded images</h2>
        <p className="hint">
          Only you see the originals here. Buyers see locked previews until they
          pay.
        </p>
        <div className="creator-gallery">
          {originals.map((asset) => (
            <figure key={asset.id}>
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${asset.name}`}
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  referrerPolicy="no-referrer"
                />
              </a>
              <figcaption>
                {asset.name}
                <small>{fileSize(asset.size)}</small>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="hint">
          Image links expire after one minute. Refresh this page to open them
          again.
        </p>
      </section>
      <section className="panel share-panel">
        <div className="share-summary">
          <div className="empty-icon">
            <Images size={25} />
          </div>
          <div>
            <h2>{drop.title}</h2>
            <p>
              {drop.assets.length} images · {money(drop.price_cents)} USD
            </p>
          </div>
          <span className="badge paid">
            {drop.status === 'PUBLISHED' ? 'Published' : 'Sales stopped'}
          </span>
        </div>
        <ShareDrop
          url={`${appUrl()}/d/${slug}`}
          title={drop.title}
          price={money(drop.price_cents)}
          count={drop.assets.length}
          bytes={drop.assets.reduce((n, a) => n + a.size_bytes, 0)}
        />
      </section>
      <StopSales dropId={drop.id} status={drop.status} />
      <div className="share-footer">
        <Link href={`/d/${slug}?preview=buyer`}>Preview buyer page ↗</Link>
        <Link href="/dashboard">Back to my drops</Link>
      </div>
    </div>
  );
}
