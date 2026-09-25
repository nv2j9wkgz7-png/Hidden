import { notFound, redirect } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { supabase } from '@/lib/supabase/server';
import { Buyer } from '@/components/buyer';
import { NavigationLink as Link } from '@/components/navigation-link';
export const dynamic = 'force-dynamic';
export default async function BuyerPreview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login');
  const { slug } = await params;
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select(
      'id,title,description,price_cents,assets(id,preview_path,original_filename,size_bytes,mime_type,status,sort_order,is_public_preview)',
    )
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .neq('moderation_state', 'REMOVED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  const { assets, ...details } = drop;
  const previews = assets
    .filter((a) => a.status === 'READY')
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ preview_path, status, sort_order, ...asset }) => ({
      ...asset,
      preview_url: db.storage.from('previews').getPublicUrl(preview_path).data
        .publicUrl,
    }));
  return (
    <>
      <div className="owner-preview">
        <Link href={`/dashboard/drops/${slug}/share`}>← Back</Link>
        <span>
          Buyer preview <small>· Checkout off</small>
        </span>
      </div>
      {previews.length ? (
        <Buyer drop={details} assets={previews} previewOnly />
      ) : (
        <div className="panel">
          <h1>No previews yet.</h1>
          <p>Finish uploading your files to see your buyer preview.</p>
          <Link href={`/new?drop=${drop.id}`}>Continue your draft ↗</Link>
        </div>
      )}
    </>
  );
}
