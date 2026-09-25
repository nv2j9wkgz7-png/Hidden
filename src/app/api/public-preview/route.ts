import { z } from 'zod';
import { supabase } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { dropModeration } from '@/lib/moderation';
import { handler, HttpError } from '@/lib/http';

export const GET = handler(async (request) => {
  const assetId = z
    .uuid()
    .parse(new URL(request.url).searchParams.get('asset_id'));
  const db = admin();
  const { data: asset, error } = await db
    .from('assets')
    .select('drop_id,storage_path')
    .eq('id', assetId)
    .eq('status', 'READY')
    .eq('is_public_preview', true)
    .maybeSingle();
  if (error) throw error;
  if (!asset) throw new HttpError(404, 'Preview unavailable.');
  const drop = await dropModeration(asset.drop_id);
  if (
    !drop ||
    drop.moderation_state !== 'ACTIVE' ||
    drop.users?.creator_suspended
  )
    throw new HttpError(404, 'Preview unavailable.');
  if (drop.status !== 'PUBLISHED') {
    // A draft preview is visible only to its creator, including the buyer-preview screen.
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    if (drop.status !== 'DRAFT' || user?.id !== drop.creator_id)
      throw new HttpError(404, 'Preview unavailable.');
  }
  const { data, error: signingError } = await db.storage
    .from('originals')
    .createSignedUrl(asset.storage_path, 60);
  if (signingError) throw signingError;
  // The redirect is never cached. Storage handles video byte ranges; existing
  // signed URLs expire within 60 seconds after a preview is disabled.
  return new Response(null, {
    status: 307,
    headers: {
      Location: data.signedUrl,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
});
