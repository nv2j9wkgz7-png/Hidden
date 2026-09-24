import { activeCreator } from '@/lib/moderation';
import { admin } from '@/lib/supabase/admin';
import {
  creator,
  handler,
  HttpError,
  json,
  sameOrigin,
  ownedDrop,
} from '@/lib/http';
import { dropInput, uuid } from '@/lib/validation';
export const PATCH = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
  const input = dropInput.extend({ id: uuid }).parse(await request.json());
  const drop = await ownedDrop(input.id, user.id);
  const { error } = await admin().rpc(
    drop.status === 'DRAFT' ? 'update_draft' : 'update_drop_details',
    {
      p_drop: input.id,
      p_creator: user.id,
      p_title: input.title,
      p_description: input.description,
      p_price: input.price_cents,
    },
  );
  if (error?.message === 'Price is locked after checkout starts')
    throw new HttpError(
      409,
      'A buyer has already started checkout. You can still edit the title and description, but keep the original price.',
    );
  if (error) throw new HttpError(403, 'This drop cannot be edited.');
  return json({ saved: true });
});
