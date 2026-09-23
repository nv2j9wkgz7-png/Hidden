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
  if (!user) redirect('/login');
  const params = await searchParams;
  let draft: Draft | undefined;
  if (params.drop) {
    if (!z.uuid().safeParse(params.drop).success) notFound();
    const { data, error } = await admin()
      .from('drops')
      .select(
        'id,title,description,price_cents,assets(id,original_filename,size_bytes,mime_type,status,sort_order,storage_path)',
      )
      .eq('id', params.drop)
      .eq('creator_id', user.id)
      .eq('status', 'DRAFT')
      .maybeSingle();
    if (error) throw error;
    if (!data) notFound();
    draft = {
      ...data,
      assets: await Promise.all(
        data.assets
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(async (asset) => {
            // Originals are signed only after verifying this creator owns the draft.
            const signed =
              asset.status === 'READY'
                ? await admin()
                    .storage.from('originals')
                    .createSignedUrl(asset.storage_path, 900)
                : null;
            if (signed?.error) throw signed.error;
            return {
              id: asset.id,
              original_filename: asset.original_filename,
              size_bytes: asset.size_bytes,
              mime_type: asset.mime_type,
              status: asset.status,
              preview_url: signed?.data?.signedUrl,
            };
          }),
      ),
    };
  }
  return (
    <>
      <Link className="back" href="/dashboard">
        ← My drops
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">The next reveal starts here</div>
          <h1>{draft ? 'Continue your drop' : 'New drop'}</h1>
          <p>Gather your photos and videos. Make them a drop.</p>
        </div>
        <span className="badge">{draft ? 'Saved draft' : 'Step 1 of 2'}</span>
      </div>
      <NewDropForm draft={draft} />
    </>
  );
}
