import Link from 'next/link';
import { supabase } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { Buyer } from '@/components/buyer';
export const dynamic = 'force-dynamic';
export default async function DropPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  if (!configured()) return <Setup />;
  const { slug } = await params;
  if (!/^[a-f0-9]{24}$/.test(slug)) notFound();
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id,title,price_cents,creator_id')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  const owner = user?.id === drop.creator_id;
  if (owner && (await searchParams).preview !== 'buyer')
    redirect(`/dashboard/drops/${slug}/share`);
  const { creator_id, ...buyerDrop } = drop;
  const { data: assets, error: assetError } = await db
    .from('assets')
    .select('id,preview_path,original_filename,size_bytes')
    .eq('drop_id', drop.id)
    .eq('status', 'READY')
    .order('sort_order');
  if (assetError) throw assetError;
  // Never serialize storage_path, purchase rows, or credentials to this public page.
  return (
    <>
      {owner && (
        <div className="owner-preview">
          You’re previewing what buyers see.{' '}
          <Link href={`/dashboard/drops/${slug}/share`}>← Back to sharing</Link>
        </div>
      )}
      <Buyer
        drop={buyerDrop}
        assets={(assets || []).map(({ preview_path, ...asset }) => ({
          ...asset,
          preview_url: db.storage.from('previews').getPublicUrl(preview_path)
            .data.publicUrl,
        }))}
      />
    </>
  );
}
