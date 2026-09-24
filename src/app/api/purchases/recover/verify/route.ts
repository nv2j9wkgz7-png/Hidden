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
import { hashToken, validToken } from '@/lib/security';
import { RECOVERY_COOKIE } from '@/lib/purchase-recovery';
import { cookieOptions } from '@/lib/access';
export const POST = handler(async (request) => {
  sameOrigin(request);
  await rateLimit(`purchase-recovery-verify:${requestIp(request)}`, 20);
  const { token } = z
    .object({ token: z.string().refine(validToken) })
    .parse(await request.json());
  const { data, error } = await admin()
    .from('purchase_recoveries')
    .select('expires_at')
    .eq('token_hash', hashToken(token))
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new HttpError(
      403,
      'This verification link has expired or was already used. Request a new one.',
    );
  const response = json({ verified: true });
  response.cookies.set(RECOVERY_COOKIE, token, {
    ...cookieOptions,
    maxAge: Math.max(
      0,
      Math.floor((Date.parse(data.expires_at) - Date.now()) / 1000),
    ),
  });
  return response;
});
