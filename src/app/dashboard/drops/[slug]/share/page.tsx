import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check, Images } from 'lucide-react';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { appUrl, configured } from '@/lib/env';
import { money } from '@/lib/format';
import { Setup } from '@/components/setup';
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
    .select('title,price_cents,assets(id)')
    .eq('slug', slug)
    .eq('creator_id', user.id)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) notFound();
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
          <span className="badge paid">Published</span>
        </div>
        <ShareDrop
          url={`${appUrl()}/d/${slug}`}
          title={drop.title}
          price={money(drop.price_cents)}
        />
      </section>
      <div className="share-footer">
        <Link href={`/d/${slug}?preview=buyer`}>Preview buyer page ↗</Link>
        <Link href="/dashboard">Back to my drops</Link>
      </div>
    </div>
  );
}
