import { dropModeration } from '@/lib/moderation';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { purchaseAccess } from '@/lib/access';
import { handler, HttpError, json, rateLimit, sameOrigin } from '@/lib/http';
import { canAccessPurchase, purchaseExpiresAt } from '@/lib/purchase-window';
import { appUrl, env } from '@/lib/env';
import { hashToken } from '@/lib/security';
import { emailArchive } from '@/lib/email/archive';
import {
  emailAccessToken,
  requestedPurchaseEmail,
  sendEmail,
} from '@/lib/email/message';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, request_id } = z
    .object({ drop_id: z.uuid(), request_id: z.uuid() })
    .parse(await request.json());
  const access = await purchaseAccess(drop_id);
  if (!canAccessPurchase(access, drop_id))
    throw new HttpError(
      403,
      'Log in to your saved purchase or open an unexpired paid guest link to request email delivery.',
    );
  await rateLimit(`purchase-email:${access!.id}`, 5);
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM ||
    !process.env.EMAIL_ACCESS_SECRET
  )
    throw new HttpError(
      503,
      'Email is unavailable. Please download your files here instead.',
    );
  const db = admin();
  const { data: purchase, error } = await db
    .from('purchases')
    .select('id,buyer_id,drop_id,status,paid_at,customer_email')
    .eq('id', access!.id)
    .single();
  if (error) throw error;
  const accountAccess =
    access!.account_access &&
    !!purchase.buyer_id &&
    purchase.buyer_id === access!.buyer_id;
  if (
    !canAccessPurchase({ ...purchase, account_access: accountAccess }, drop_id)
  )
    throw new HttpError(403, 'Purchase access has ended.');
  if (!purchase.customer_email)
    throw new HttpError(
      409,
      'No checkout email is available. Please download your files here instead.',
    );
  const { data: drop, error: dropError } = await db
    .from('drops')
    .select('title,slug')
    .eq('id', drop_id)
    .single();
  if (dropError) throw dropError;
  const { data: files, error: filesError } = await db
    .from('assets')
    .select('storage_path,original_filename,size_bytes,sort_order')
    .eq('drop_id', drop_id)
    .eq('status', 'READY')
    .order('sort_order');
  if (filesError) throw filesError;
  if (!files?.length) throw new HttpError(404, 'Files are unavailable.');
  const archive = await emailArchive(files, async (path) => {
    const { data, error } = await db.storage.from('originals').download(path);
    if (error) throw error;
    return new Uint8Array(await data.arrayBuffer());
  });
  const url = new URL(
    accountAccess ? '/purchases' : `/d/${drop.slug}`,
    appUrl(),
  );
  if (url.protocol !== 'https:')
    throw new HttpError(503, 'Email requires a secure site address.');
  if (accountAccess) {
    // Saved purchases never get a permanent bearer link. Recheck ownership and payment.
    const { data: ready, error: readyError } = await db
      .from('purchases')
      .select('id')
      .eq('id', purchase.id)
      .eq('buyer_id', purchase.buyer_id)
      .eq('status', 'PAID')
      .maybeSingle();
    if (readyError) throw readyError;
    if (!ready) throw new HttpError(403, 'Purchase access has ended.');
  } else {
    const token = emailAccessToken(purchase.id, env('EMAIL_ACCESS_SECRET'));
    const { data: ready, error: tokenError } = await db
      .from('purchases')
      .update({ email_access_token: hashToken(token) })
      .eq('id', purchase.id)
      .eq('status', 'PAID')
      .gt('paid_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
      .select('id')
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!ready) throw new HttpError(403, 'Purchase access has ended.');
    url.hash = `access=${token}`;
  }
  const expiresAt = accountAccess ? null : purchaseExpiresAt(purchase)!;
  if ((await dropModeration(drop_id))?.moderation_state === 'REMOVED')
    throw new HttpError(410, 'This content is unavailable.');
  const id = await sendEmail({
    apiKey: env('RESEND_API_KEY'),
    from: env('EMAIL_FROM'),
    to: purchase.customer_email,
    idempotencyKey: `requested-zip/${purchase.id}/${request_id}`,
    message: requestedPurchaseEmail({
      title: drop.title,
      url: url.toString(),
      expiresAt,
      attached: !!archive,
      accountAccess,
    }),
    ...(archive
      ? {
          attachments: [
            {
              filename: 'hidn-originals.zip',
              content: Buffer.from(archive).toString('base64'),
            },
          ],
        }
      : {}),
  });
  const { error: sentError } = await db
    .from('purchases')
    .update({ email_sent_at: new Date().toISOString(), email_provider_id: id })
    .eq('id', purchase.id);
  if (sentError) throw sentError;
  return json({
    sent: true,
    delivery: archive ? 'attachment' : 'link',
    expires_at: expiresAt,
  });
});
