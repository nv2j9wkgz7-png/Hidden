import { notFound, redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { SavePurchase } from '@/components/save-purchase';
export const dynamic = 'force-dynamic';
export default async function Save({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!/^[a-f0-9]{24}$/.test(slug)) notFound();
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/purchases/save/${slug}`)}`);
  const { data: drop, error } = await admin()
    .from('drops')
    .select('id,title')
    .eq('slug', slug)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  return <SavePurchase dropId={drop.id} title={drop.title} slug={slug} />;
}
