import Link from 'next/link';
import { notFound } from 'next/navigation';
import { creator } from '@/lib/http';
import { admin } from '@/lib/supabase/admin';
import { StopSales } from '@/components/stop-sales';
export default async function ManageDrop({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await creator();
  const { slug } = await params;
  const { data: drop, error } = await admin()
    .from('drops')
    .select('id,title,status')
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .in('status', ['PUBLISHED', 'CLOSING', 'CLOSED'])
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
  return (
    <>
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <h1>{drop.title}</h1>
      <StopSales dropId={drop.id} status={drop.status} />
    </>
  );
}
