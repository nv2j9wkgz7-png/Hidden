import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const input = z
    .object({ drop_id: z.uuid(), asset_ids: z.array(z.uuid()).max(20) })
    .parse(await request.json());
  const { error } = await admin().rpc('reorder_draft_assets', {
    p_drop: input.drop_id,
    p_creator: user.id,
    p_assets: input.asset_ids,
  });
  if (error) throw error;
  return json({ saved: true });
});
