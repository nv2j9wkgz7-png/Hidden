import { cookies } from 'next/headers';
import { admin } from '@/lib/supabase/admin';
import {
  creator,
  handler,
  HttpError,
  json,
  rateLimit,
  sameOrigin,
} from '@/lib/http';
import { hashToken, validToken } from '@/lib/security';
import { RECOVERY_COOKIE } from '@/lib/purchase-recovery';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  await rateLimit(`purchase-recovery-claim:${user.id}`, 20);
  const token = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!validToken(token))
    throw new HttpError(
      403,
      'Verify your checkout email before claiming purchases.',
    );
  const { data, error } = await admin().rpc('claim_recovered_purchases', {
    p_token_hash: hashToken(token),
    p_buyer_id: user.id,
  });
  if (error) {
    if (error.code === 'P0001')
      throw new HttpError(
        403,
        'This verification has expired or was already used. Request a new email.',
      );
    throw error;
  }
  // Keep the short-lived HttpOnly proof so a lost response can be retried
  // idempotently for this account. It cannot claim again for another account.
  return json({ claimed: data });
});
