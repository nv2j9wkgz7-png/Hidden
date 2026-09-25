import { NavigationLink as Link } from '@/components/navigation-link';
import { redirect, notFound } from 'next/navigation';
import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { Setup } from '@/components/setup';
import { NewDropForm, type Draft } from '@/components/new-drop-form';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export default async function NewDrop({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string }>;
}) {
  if (!configured()) return <Setup />;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login?mode=signup&next=new');
  const { data: profile, error: profileError } = await admin()
    .from('users')
    .select('creator_suspended')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  if (profile.creator_suspended)
    return (
      <section className="panel">
        <h1>Creating drops is paused.</h1>
        <p>
          Your creator account is suspended. Contact team@sendhidn.com for
          review.
        </p>
        <Link href="/dashboard">My drops</Link>
      </section>
    );
  const params = await searchParams;
  let draft: Draft | undefined;
  if (params.drop) {
    if (!z.uuid().safeParse(params.drop).success) notFound();
    const { data, error } = await admin()
      .from('drops')
      .select(
        'id,title,description,price_cents,assets(id,original_filename,size_bytes,mime_type,status,sort_order,is_public_preview)',
      )
      .eq('id', params.drop)
      .eq('creator_id', user.id)
      .neq('moderation_state', 'REMOVED')
      .eq('status', 'DRAFT')
      .maybeSingle();
    if (error) throw error;
    if (!data) notFound();
    draft = {
      ...data,
      assets: data.assets
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((asset) => ({
          ...asset,
          preview_url:
            asset.status === 'READY'
              ? `/api/creator/media?asset_id=${asset.id}`
              : undefined,
        })),
    };
  }
  return (
    <>
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">Your creator studio</div>
          <h1>{draft ? 'Continue your drop' : 'New drop'}</h1>
          <p>Add your files. Set your price.</p>
        </div>
        <span className="badge">{draft ? 'Saved draft' : 'Step 1 of 2'}</span>
      </div>
      <ol className="creation-steps" aria-label="Create a drop">
        <li aria-current="step">
          <span>1</span> Create
        </li>
        <li>
          <span>2</span> Review & share
        </li>
      </ol>
      <NewDropForm key={draft?.id || 'new'} draft={draft} userId={user.id} />
    </>
  );
}
