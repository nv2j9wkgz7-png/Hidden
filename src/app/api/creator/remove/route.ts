import { activeCreator } from '@/lib/moderation';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const { drop_id, asset_id } = z
    .object({ drop_id: z.uuid(), asset_id: z.uuid() })
    .parse(await request.json());
  const db = admin();
  const { data, error } = await db.rpc('remove_draft_asset', {
    p_drop: drop_id,
    p_creator: user.id,
    p_asset: asset_id,
  });
  if (error) throw error;
  if (data) {
    const results = await Promise.all([
      db.storage.from('originals').remove([data.storage_path]),
      db.storage.from('previews').remove([`${drop_id}/${asset_id}.jpg`]),
    ]);
    if (results.some((r) => r.error))
      console.error(
        'Draft file cleanup failed; remove orphaned objects using the maintenance guide.',
      );
  }
  return json({ removed: true });
});
