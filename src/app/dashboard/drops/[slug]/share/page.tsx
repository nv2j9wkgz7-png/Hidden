import { NavigationLink as Link } from '@/components/navigation-link';
import { notFound, redirect } from 'next/navigation';
import { EditDropDetails } from '@/components/edit-drop-details';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { appUrl, configured } from '@/lib/env';
import { money, fileSize } from '@/lib/format';
import { Setup } from '@/components/setup';
import { ReviewActions } from '@/components/review-actions';
import { PublishDrop } from '@/components/publish-drop';
import { CreatorGallery } from '@/components/creator-gallery';
import { ShareDrop } from '@/components/share-drop';
import { StopSales } from '@/components/stop-sales';

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
      'id,status,title,description,price_cents,assets(id,mime_type,size_bytes,storage_path,original_filename,status,sort_order)',
    )
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .neq('moderation_state', 'REMOVED')
    .in('status', ['DRAFT', 'PUBLISHED', 'CLOSING', 'CLOSED'])
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
          mime: asset.mime_type,
        };
      }),
  );
  return (
    <div className="share-page">
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="page-heading review-heading">
        <div>
          <div className="eyebrow">
            {drop.status === 'DRAFT'
              ? 'Step 2 · The final look'
              : 'Your drop, ready to travel'}
          </div>
          <h1>{drop.title}</h1>
          <p>
            {originals.length} files ·{' '}
            {fileSize(originals.reduce((n, a) => n + a.size, 0))} ·{' '}
            {money(drop.price_cents)} USD
          </p>
        </div>
        <span className="badge paid">
          {drop.status === 'DRAFT'
            ? 'Draft'
            : drop.status === 'PUBLISHED'
              ? 'Ready to share'
              : 'Sales stopped'}
        </span>
      </div>
      {drop.status === 'DRAFT' && (
        <ol className="creation-steps" aria-label="Create a drop">
          <li>
            <span>1</span> Create
          </li>
          <li aria-current="step">
            <span>2</span> Review & share
          </li>
        </ol>
      )}
      {drop.status !== 'DRAFT' && (
        <Link
          className="button secondary"
          href={`/dashboard/drops/${slug}/analytics`}
        >
          View analytics ↗
        </Link>
      )}
      <EditDropDetails
        draft={drop.status === 'DRAFT'}
        drop={{
          id: drop.id,
          title: drop.title,
          description: drop.description,
          price_cents: drop.price_cents,
        }}
      />
      {drop.status === 'DRAFT' && (
        <Link href={`/new?drop=${drop.id}`} className="text-button">
          Add files or drag to reorder ↗
        </Link>
      )}
      <Link
        href={`/dashboard/drops/${slug}/preview`}
        className="button secondary"
      >
        Preview as buyer ↗
      </Link>
      <section className="panel creator-gallery-panel">
        <h2>Your photos & videos</h2>
        <p className="hint">
          Tap a photo or video to view it. Buyers see blurred previews until
          they pay.
        </p>
        <CreatorGallery images={originals} />
      </section>
      <section className="panel share-panel">
        {drop.status === 'DRAFT' ? (
          <PublishDrop id={drop.id} />
        ) : (
          <ShareDrop
            url={`${appUrl()}/d/${slug}`}
            title={drop.title}
            price={money(drop.price_cents)}
            count={drop.assets.length}
            bytes={drop.assets.reduce((n, a) => n + a.size_bytes, 0)}
          />
        )}
      </section>
      <ReviewActions draft={drop.status === 'DRAFT'} />
      {drop.status !== 'DRAFT' && (
        <StopSales dropId={drop.id} status={drop.status} compact />
      )}
    </div>
  );
}
