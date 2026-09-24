import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { guestPurchase, cookieOptions } from '@/lib/access';
import { dropModeration } from '@/lib/moderation';
import {
  handler,
  HttpError,
  json,
  rateLimit,
  requestIp,
  sameOrigin,
} from '@/lib/http';
import { env } from '@/lib/env';
import { newToken } from '@/lib/security';
import { canAccessPurchase } from '@/lib/purchase-window';
import {
  challengeCookie,
  pendingCookie,
  CODE_LIFETIME_SECONDS,
  normalizeCheckoutEmail,
  verificationCodeHash,
} from '@/lib/purchase-device';
import { purchaseCodeEmail, sendEmail } from '@/lib/email/message';
export const POST = handler(async (request) => {
  sameOrigin(request);
  await rateLimit(`purchase-code-request-ip:${requestIp(request)}`, 10);
  const { drop_id } = z
    .object({ drop_id: z.uuid() })
    .parse(await request.json());
  const guest = await guestPurchase(drop_id);
  if (
    !guest ||
    !canAccessPurchase(guest.purchase, drop_id) ||
    (await dropModeration(drop_id))?.moderation_state === 'REMOVED'
  )
    throw new HttpError(
      403,
      'Open an unexpired purchase link, or recover your purchase from Help.',
    );
  if (!guest.purchase.customer_email)
    throw new HttpError(
      409,
      'The checkout email is not available yet. Please try again shortly or contact support.',
    );
  await rateLimit(`purchase-code-send:${guest.purchase.id}`, 3, 600);
  await rateLimit(`purchase-code-send-day:${guest.purchase.id}`, 12, 86400);
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(
      503,
      'Email verification is temporarily unavailable. Please try again later.',
    );
  const email = normalizeCheckoutEmail(guest.purchase.customer_email);
  const challenge = newToken();
  const code = randomInt(0, 1000000).toString().padStart(6, '0');
  const tokenHash = verificationCodeHash(
    challenge,
    guest.purchase.id,
    code,
    env('EMAIL_ACCESS_SECRET'),
  );
  const db = admin();
  // Reuse the private, expiring email-proof store. This domain-separated HMAC
  // is not a recovery-link token and cannot be redeemed by the recovery API.
  const { error } = await db.from('purchase_recoveries').insert({
    token_hash: tokenHash,
    email,
    expires_at: new Date(
      Date.now() + CODE_LIFETIME_SECONDS * 1000,
    ).toISOString(),
  });
  if (error) throw error;
  try {
    await sendEmail({
      apiKey: env('RESEND_API_KEY'),
      from: env('EMAIL_FROM'),
      to: email,
      idempotencyKey: `purchase-code/${tokenHash}`,
      message: purchaseCodeEmail(code),
    });
  } catch {
    await db.from('purchase_recoveries').delete().eq('token_hash', tokenHash);
    throw new HttpError(
      503,
      'We couldn’t send the code. Please try again later.',
    );
  }
  const response = json({ sent: true });
  response.cookies.set(challengeCookie(drop_id), challenge, {
    ...cookieOptions,
    maxAge: CODE_LIFETIME_SECONDS,
  });
  response.cookies.set(pendingCookie(drop_id), guest.token, {
    ...cookieOptions,
    maxAge: 72 * 3600,
  });
  await db
    .from('purchase_recoveries')
    .delete()
    .lt('expires_at', new Date(Date.now() - 86400000).toISOString());
  return response;
});
