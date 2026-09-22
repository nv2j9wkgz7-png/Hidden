import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import {
  handler,
  HttpError,
  json,
  rateLimit,
  requestIp,
  sameOrigin,
} from '@/lib/http';
import { appUrl } from '@/lib/env';
import { paymentProvider } from '@/lib/payments';
import { newToken, hashToken, accessCookie } from '@/lib/security';
import { cookieOptions, purchaseAccess } from '@/lib/access';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  await rateLimit(`checkout:${requestIp(request)}`, 20);
  const existing = await purchaseAccess(drop_id);
  if (existing?.status === 'PAID')
    throw new HttpError(409, 'You already have access. Refresh this page.');
  if (
    existing?.status === 'PENDING' &&
    existing.payment_provider_transaction_id
  ) {
    const checkout = await paymentProvider(
      existing.payment_provider,
    ).getCheckout(existing.payment_provider_transaction_id);
    if (checkout.status === 'open' && checkout.url)
      return json({ url: checkout.url });
    if (checkout.status === 'complete')
      throw new HttpError(
        409,
        'Your checkout is complete. Please wait for payment confirmation; do not pay again.',
      );
  }
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id,slug,title,price_cents,currency')
    .eq('id', drop_id)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw error;
  if (!drop) throw new HttpError(404, 'Drop not found.');
  const provider = paymentProvider();
  const token = newToken();
  const { data: purchase, error: insertError } = await db
    .from('purchases')
    .insert({
      drop_id: drop.id,
      payment_provider: provider.name,
      amount_cents: drop.price_cents,
      currency: drop.currency,
      access_token: hashToken(token),
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  const checkout = await provider.createCheckout({
    purchaseId: purchase.id,
    title: drop.title,
    amountCents: drop.price_cents,
    currency: 'usd',
    successUrl: `${appUrl()}/d/${drop.slug}#access=${token}`,
    cancelUrl: `${appUrl()}/d/${drop.slug}`,
  });
  const { error: updateError } = await db
    .from('purchases')
    .update({ payment_provider_transaction_id: checkout.id })
    .eq('id', purchase.id)
    .is('payment_provider_transaction_id', null);
  if (updateError) throw updateError;
  const response = json({ url: checkout.url });
  response.cookies.set(accessCookie(drop.id), token, cookieOptions);
  return response;
});
