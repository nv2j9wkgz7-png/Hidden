import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import {
  creator,
  handler,
  json,
  ownedDrop,
  sameOrigin,
  HttpError,
} from '@/lib/http';
import { paymentProvider } from '@/lib/payments';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const drop = await ownedDrop(drop_id, user.id);
  if (drop.status === 'DRAFT')
    throw new HttpError(400, 'This drop is not published.');
  const db = admin();
  const { error } = await db
    .from('drops')
    .update({ status: 'CLOSING' })
    .eq('id', drop_id)
    .eq('creator_id', user.id)
    .eq('status', 'PUBLISHED');
  if (error) throw error;
  // Paginate so every unpaid session is handled, including older shared checkouts.
  let cursor: string | undefined;
  for (;;) {
    let query = db
      .from('purchases')
      .select(
        'id,payment_provider,payment_provider_transaction_id,stripe_account_id',
      )
      .eq('drop_id', drop_id)
      .eq('status', 'PENDING')
      .not('payment_provider_transaction_id', 'is', null)
      .order('id')
      .limit(100);
    if (cursor) query = query.gt('id', cursor);
    const { data: purchases, error } = await query;
    if (error) throw error;
    await Promise.all(
      (purchases || []).map((p) =>
        paymentProvider(p.payment_provider, p.stripe_account_id).expireCheckout(
          p.payment_provider_transaction_id,
        ),
      ),
    );
    if (!purchases || purchases.length < 100) break;
    cursor = purchases[purchases.length - 1].id;
  }
  const { error: closeError } = await db
    .from('drops')
    .update({ status: 'CLOSED' })
    .eq('id', drop_id)
    .eq('creator_id', user.id);
  if (closeError) throw closeError;
  return json({ status: 'CLOSED' });
});
