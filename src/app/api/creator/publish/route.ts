import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, ownedDrop, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const drop = await ownedDrop(drop_id, user.id);
  const { error } = await admin().rpc('publish_drop', {
    p_drop: drop.id,
    p_creator: user.id,
  });
  if (error) throw error;
  return json({ url: `/d/${drop.slug}` });
});
