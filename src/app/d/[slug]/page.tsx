import { notFound } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { Buyer } from '@/components/buyer';
export const dynamic = 'force-dynamic';
export default async function DropPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!configured()) return <Setup />;
  const { slug } = await params;
  if (!/^[a-f0-9]{24}$/.test(slug)) notFound();
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id,title,price_cents')
    .eq('slug', slug)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  const { data: assets, error: assetError } = await db
    .from('assets')
    .select('id,preview_path,original_filename,size_bytes')
    .eq('drop_id', drop.id)
    .eq('status', 'READY')
    .order('sort_order');
  if (assetError) throw assetError;
  // Never serialize storage_path, purchase rows, or credentials to this public page.
  return (
    <Buyer
      drop={drop}
      assets={(assets || []).map(({ preview_path, ...asset }) => ({
        ...asset,
        preview_url: db.storage.from('previews').getPublicUrl(preview_path).data
          .publicUrl,
      }))}
    />
  );
}
