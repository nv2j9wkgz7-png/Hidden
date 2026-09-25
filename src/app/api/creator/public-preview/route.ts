import { z } from 'zod';
import { activeCreator } from '@/lib/moderation';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json, ownedDrop, sameOrigin } from '@/lib/http';

export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const input = z
    .object({
      drop_id: z.uuid(),
      asset_ids: z.array(z.uuid()).max(20),
      confirmed: z.boolean().optional(),
    })
    .parse(await request.json());
  if (input.asset_ids.length && input.confirmed !== true)
    throw new HttpError(
      400,
      'Confirm that these files will be visible before purchase.',
    );
  const drop = await ownedDrop(input.drop_id, user.id);
  if (!['DRAFT', 'PUBLISHED'].includes(drop.status))
    throw new HttpError(409, 'This drop is no longer editable.');
  const { error } = await admin().rpc('set_public_previews', {
    p_drop: drop.id,
    p_creator: user.id,
    p_assets: input.asset_ids,
  });
  if (error) throw error;
  return json({ saved: true });
});
