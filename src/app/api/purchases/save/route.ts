import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { purchaseAccess, guestPurchase } from '@/lib/access';
import { canAccessPurchase, PURCHASE_ACCESS_MS } from '@/lib/purchase-window';
import { creator, handler, HttpError, json, sameOrigin } from '@/lib/http';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const access = await purchaseAccess(drop_id);
  if (
    !access &&
    canAccessPurchase((await guestPurchase(drop_id))?.purchase ?? null, drop_id)
  )
    return json({ verification_required: true });
  if (!canAccessPurchase(access, drop_id))
    throw new HttpError(
      403,
      'Open your paid private link and save it before the 72-hour deadline.',
    );
  if (access!.account_access) return json({ saved: true });
  if (!access!.email_verified) return json({ verification_required: true });
  const db = admin();
  const { data, error } = await db
    .from('purchases')
    .update({ buyer_id: user.id, saved_at: new Date().toISOString() })
    .eq('id', access!.id)
    .eq('status', 'PAID')
    .is('buyer_id', null)
    .eq('customer_email', access!.customer_email)
    .gt('paid_at', new Date(Date.now() - PURCHASE_ACCESS_MS).toISOString())
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: saved, error: lookupError } = await db
      .from('purchases')
      .select('buyer_id,status')
      .eq('id', access!.id)
      .single();
    if (lookupError) throw lookupError;
    if (saved.buyer_id !== user.id || saved.status !== 'PAID')
      throw new HttpError(
        409,
        'This purchase cannot be saved. It may already belong to another account or its access has ended.',
      );
  }
  return json({ saved: true });
});
