import { cookies } from 'next/headers';
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
import { accessCookie, validToken } from '@/lib/security';
import { canAccessPurchase, purchaseExpiresAt } from '@/lib/purchase-window';
import {
  challengeCookie,
  pendingCookie,
  deviceCookie,
  normalizeCheckoutEmail,
  signDeviceProof,
  verificationCodeHash,
} from '@/lib/purchase-device';
export const POST = handler(async (request) => {
  sameOrigin(request);
  await rateLimit(`purchase-code-verify-ip:${requestIp(request)}`, 30, 600);
  const { drop_id, code } = z
    .object({ drop_id: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .parse(await request.json());
  const challenge = (await cookies()).get(challengeCookie(drop_id))?.value;
  const guest = await guestPurchase(drop_id);
  if (
    !guest ||
    !validToken(challenge) ||
    !guest.purchase.customer_email ||
    !canAccessPurchase(guest.purchase, drop_id) ||
    (await dropModeration(drop_id))?.moderation_state === 'REMOVED'
  )
    throw new HttpError(
      403,
      'Verification expired. Request a new code or recover your purchase from Help.',
    );
  // A shared purchase budget prevents resends or cookie changes resetting guesses.
  await rateLimit(`purchase-code-guesses:${guest.purchase.id}`, 10, 600);
  await rateLimit(`purchase-code-challenge:${challenge}`, 5, 600);
  const secret = env('EMAIL_ACCESS_SECRET');
  const email = normalizeCheckoutEmail(guest.purchase.customer_email);
  const { data, error } = await admin()
    .from('purchase_recoveries')
    .update({ used_at: new Date().toISOString() })
    .eq(
      'token_hash',
      verificationCodeHash(challenge, guest.purchase.id, code, secret),
    )
    .eq('email', email)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token_hash')
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new HttpError(
      403,
      'That code is incorrect, expired, or already used.',
    );
  const expires = Date.parse(purchaseExpiresAt(guest.purchase)!);
  const response = json({ verified: true });
  response.cookies.set(accessCookie(drop_id), guest.token, cookieOptions);
  response.cookies.set(
    deviceCookie(drop_id),
    signDeviceProof(guest.purchase.id, guest.token, expires, secret, email),
    {
      ...cookieOptions,
      maxAge: Math.max(0, Math.floor((expires - Date.now()) / 1000)),
    },
  );
  response.cookies.delete(challengeCookie(drop_id));
  response.cookies.delete(pendingCookie(drop_id));
  return response;
});
