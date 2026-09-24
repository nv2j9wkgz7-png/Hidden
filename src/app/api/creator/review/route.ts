import { activeCreator } from '@/lib/moderation';
import { z } from 'zod';
import { creator, handler, json, ownedDrop, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const drop = await ownedDrop(drop_id, user.id);
  return json({ review_url: `/dashboard/drops/${drop.slug}/share` });
});
