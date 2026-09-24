import { activeCreator } from '@/lib/moderation';
import { readyPayoutAccount } from '@/lib/connect';
import { HttpError } from '@/lib/http';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, json, ownedDrop, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const drop = await ownedDrop(drop_id, user.id);
  if (!(await readyPayoutAccount(user.id)))
    throw new HttpError(
      409,
      'Set up payouts in Account → Earnings & payouts before publishing. Your draft is saved.',
    );
  const { error } = await admin().rpc('publish_drop', {
    p_drop: drop.id,
    p_creator: user.id,
  });
  if (error) throw error;
  return json({
    url: `/d/${drop.slug}`,
    share_url: `/dashboard/drops/${drop.slug}/share`,
  });
});
