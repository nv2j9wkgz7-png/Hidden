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
import { fileSize } from '@/lib/format';
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
  const db = admin();
  const { data: drop, error } = await db
    .from('drops')
    .select('id,slug,title,description,price_cents,currency')
    .eq('id', drop_id)
    .eq('status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw error;
  if (!drop)
    throw new HttpError(410, 'This drop is no longer accepting purchases.');
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
    if (checkout.status === 'open' && checkout.url) {
      if (checkout.presentationReady) return json({ url: checkout.url });
      // Replace legacy, unpaid sessions so returning buyers see the summary too.
      await paymentProvider(existing.payment_provider).expireCheckout(
        existing.payment_provider_transaction_id,
      );
      const latest = await paymentProvider(
        existing.payment_provider,
      ).getCheckout(existing.payment_provider_transaction_id);
      if (latest.status !== 'expired')
        throw new HttpError(
          409,
          'Your checkout is being processed. Refresh this page before trying again.',
        );
    }
    if (checkout.status === 'complete')
      throw new HttpError(
        409,
        'Your checkout is complete. Please wait for payment confirmation; do not pay again.',
      );
  }
  const { data: assets, error: assetsError } = await db
    .from('assets')
    .select('preview_path,size_bytes')
    .eq('drop_id', drop.id)
    .eq('status', 'READY')
    .order('sort_order');
  if (assetsError) throw assetsError;
  const summary = `${assets?.length || 0} images · ${fileSize((assets || []).reduce((sum, asset) => sum + asset.size_bytes, 0))}. Full-resolution originals + ZIP download after payment.`;
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
    description: [summary, drop.description]
      .filter(Boolean)
      .join(' ')
      .slice(0, 500),
    // Only sanitized, public previews reach Stripe; originals remain private.
    previewUrl: assets?.[0]?.preview_path
      ? db.storage.from('previews').getPublicUrl(assets[0].preview_path).data
          .publicUrl
      : undefined,
    logoUrl: `${appUrl()}/hidn-checkout-logo.png`,
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
  // If the creator closed sales while checkout was being created, revoke it
  // before returning a URL. Stop-sales also expires all registered sessions.
  const { data: latest, error: statusError } = await db
    .from('drops')
    .select('status')
    .eq('id', drop.id)
    .single();
  if (statusError || latest?.status !== 'PUBLISHED') {
    await provider.expireCheckout(checkout.id);
    throw new HttpError(410, 'This drop is no longer accepting purchases.');
  }
  const response = json({ url: checkout.url });
  response.cookies.set(accessCookie(drop.id), token, cookieOptions);
  return response;
});
