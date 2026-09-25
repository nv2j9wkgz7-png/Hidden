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
import { PublicPreviewSettings } from '@/components/public-preview-settings';
import {
  Eye,
  Pencil,
  ChartNoAxesColumn,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { EarningsEstimate } from '@/components/earnings-estimate';
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
      'id,status,title,description,price_cents,assets(id,mime_type,size_bytes,storage_path,original_filename,status,sort_order,is_public_preview)',
    )
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .neq('moderation_state', 'REMOVED')
    .in('status', ['DRAFT', 'PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  const originals = drop.assets
    .filter((a) => a.status === 'READY')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((asset) => ({
      id: asset.id,
      name: asset.original_filename,
      size: asset.size_bytes,
      url: `/api/creator/media?asset_id=${asset.id}&view=original`,
      thumbnailUrl: `/api/creator/media?asset_id=${asset.id}`,
      mime: asset.mime_type,
      freePreview: asset.is_public_preview,
    }));
  return (
    <div className="share-page creator-studio">
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <header className="creator-heading">
        <div className="studio-title-row">
          <h1>{drop.title}</h1>
          <span
            className={`badge ${drop.status === 'PUBLISHED' ? 'paid' : ''}`}
          >
            {drop.status === 'DRAFT'
              ? 'Draft'
              : drop.status === 'PUBLISHED'
                ? 'Live'
                : 'Sales stopped'}
          </span>
        </div>
        <p>
          {originals.length} files ·{' '}
          {fileSize(originals.reduce((n, a) => n + a.size, 0))} ·{' '}
          {money(drop.price_cents)} USD
        </p>
      </header>
      <nav className="studio-toolbar" aria-label="Drop tools">
        {drop.status === 'DRAFT' && (
          <Link href={`/new?drop=${drop.id}`}>
            <Pencil size={17} aria-hidden="true" />
            Edit
          </Link>
        )}
        <Link href={`/dashboard/drops/${slug}/preview`}>
          <Eye size={18} aria-hidden="true" />
          Preview
        </Link>
        {drop.status !== 'DRAFT' && (
          <Link href={`/dashboard/drops/${slug}/analytics`}>
            <ChartNoAxesColumn size={18} aria-hidden="true" />
            Stats
          </Link>
        )}
      </nav>
      <section className="studio-files" aria-label="Your files">
        <CreatorGallery images={originals} />
      </section>
      <EarningsEstimate cents={drop.price_cents} />
      <details className="studio-disclosure">
        <summary>
          <Pencil size={18} aria-hidden="true" />
          <span>Edit details</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <EditDropDetails
          draft={drop.status === 'DRAFT'}
          drop={{
            id: drop.id,
            title: drop.title,
            description: drop.description,
            price_cents: drop.price_cents,
          }}
        />
      </details>
      {['DRAFT', 'PUBLISHED'].includes(drop.status) && originals.length > 0 && (
        <details className="studio-disclosure">
          <summary>
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>Free previews</span>
            <small>
              {originals.filter((a) => a.freePreview).length} selected
            </small>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>
          <PublicPreviewSettings
            dropId={drop.id}
            published={drop.status === 'PUBLISHED'}
            assets={originals}
            selectedIds={drop.assets
              .filter((a) => a.is_public_preview)
              .map((a) => a.id)}
          />
        </details>
      )}
      {drop.status === 'DRAFT' ? (
        <div className="studio-publish-bar">
          <PublishDrop id={drop.id} />
        </div>
      ) : (
        <ShareDrop
          compact
          url={`${appUrl()}/d/${slug}`}
          title={drop.title}
          price={money(drop.price_cents)}
          count={drop.assets.length}
          bytes={drop.assets.reduce((n, a) => n + a.size_bytes, 0)}
        />
      )}
      <ReviewActions draft={drop.status === 'DRAFT'} />
      {drop.status !== 'DRAFT' && (
        <StopSales dropId={drop.id} status={drop.status} compact />
      )}
    </div>
  );
}
