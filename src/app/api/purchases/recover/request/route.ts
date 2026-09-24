import { admin } from '@/lib/supabase/admin';
import {
  handler,
  HttpError,
  json,
  rateLimit,
  requestIp,
  sameOrigin,
} from '@/lib/http';
import { appUrl, env } from '@/lib/env';
import { recoveryEmail } from '@/lib/purchase-recovery';
import { hashToken, newToken } from '@/lib/security';
import { purchaseRecoveryEmail, sendEmail } from '@/lib/email/message';
import { z } from 'zod';
export const POST = handler(async (request) => {
  sameOrigin(request);
  await rateLimit(`purchase-recovery-ip:${requestIp(request)}`, 5);
  const { email } = z
    .object({ email: recoveryEmail })
    .parse(await request.json());
  await rateLimit(`purchase-recovery-email:${email}`, 3);
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new HttpError(
      503,
      'Recovery email is temporarily unavailable. Please try again later.',
    );
  const url = new URL('/purchases/recover/verify', appUrl());
  if (url.protocol !== 'https:')
    throw new HttpError(503, 'Recovery requires a secure site address.');
  const token = newToken(),
    tokenHash = hashToken(token);
  const db = admin();
  // Always verify the mailbox first. The request never looks up purchases or
  // reveals whether this address bought anything, and never creates an account.
  const { error } = await db
    .from('purchase_recoveries')
    .insert({ token_hash: tokenHash, email });
  if (error) throw error;
  url.hash = `verify=${token}`;
  try {
    await sendEmail({
      apiKey: env('RESEND_API_KEY'),
      from: env('EMAIL_FROM'),
      to: email,
      idempotencyKey: `purchase-recovery/${tokenHash}`,
      message: purchaseRecoveryEmail(url.toString()),
    });
  } catch {
    // A delivery error is independent of purchase existence; no provider body or token is logged.
    throw new HttpError(
      503,
      'We couldn’t send the verification email. Please try again later.',
    );
  }
  // Proofs are short lived; retain at most one day beyond expiry for retries.
  await db
    .from('purchase_recoveries')
    .delete()
    .lt('expires_at', new Date(Date.now() - 86400000).toISOString());
  return json({ sent: true });
});
