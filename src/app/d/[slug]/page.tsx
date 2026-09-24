import type { Metadata } from 'next';
import { publicDrop } from '@/lib/public-drop';
import { appUrl } from '@/lib/env';
import { money, fileSize } from '@/lib/format';
import { NavigationLink as Link } from '@/components/navigation-link';
import { supabase } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { Buyer } from '@/components/buyer';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const drop = await publicDrop(slug);
  if (!drop) return { title: 'Drop unavailable' };
  const description = `${drop.assets.length} private files · ${fileSize(drop.assets.reduce((n, a) => n + a.size_bytes, 0))} · ${money(drop.price_cents)} USD. Preview, pay, and unlock full-resolution originals.`;
  const socialTitle = `Unlock ${drop.title} · ${drop.assets.length} private files · ${fileSize(drop.assets.reduce((n, a) => n + a.size_bytes, 0))} · ${money(drop.price_cents)} USD | Hidn`;
  const url = `${appUrl()}/d/${slug}`;
  return {
    title: drop.title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: 'Hidn',
      type: 'website',
      images: [
        {
          url: `${url}/card?v=11`,
          width: 1000,
          height: 1000,
          alt: 'Blurred collection cover watermarked with the Hidn H',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [`${url}/card?v=11`],
    },
  };
}
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
    .select('id,slug,title,description,price_cents,creator_id,status')
    .eq('slug', slug)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
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
    .select('id,preview_path,original_filename,size_bytes,mime_type')
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
        salesClosed={drop.status !== 'PUBLISHED'}
        assets={(assets || []).map(({ preview_path, ...asset }) => ({
          ...asset,
          preview_url: db.storage.from('previews').getPublicUrl(preview_path)
            .data.publicUrl,
        }))}
      />
    </>
  );
}
