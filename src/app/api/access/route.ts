import { dropModeration } from '@/lib/moderation';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json, sameOrigin } from '@/lib/http';
import { accessCookie, hashToken, validToken } from '@/lib/security';
import { cookieOptions, purchaseAccess } from '@/lib/access';
import { purchaseExpiresAt, purchaseViewStatus } from '@/lib/purchase-window';
export const GET = handler(async (request) => {
  const dropId = z
    .uuid()
    .parse(new URL(request.url).searchParams.get('drop_id'));
  if ((await dropModeration(dropId))?.moderation_state === 'REMOVED')
    return json({
      status: 'UNAVAILABLE',
      expires_at: null,
      account_saved: false,
    });
  const purchase = await purchaseAccess(dropId);
  const response: {
    status: string;
    token?: string;
    expires_at: string | null;
    account_saved: boolean;
    library_url?: string;
  } = {
    status: purchaseViewStatus(purchase),
    expires_at: purchase?.account_access ? null : purchaseExpiresAt(purchase),
    account_saved: purchase?.account_access === true,
  };
  // Requested explicitly by the buyer to save their private recovery link.
  if (
    response.status === 'PAID' &&
    new URL(request.url).searchParams.get('recovery') === '1'
  )
    if (purchase?.account_access) response.library_url = '/purchases';
    else response.token = (await cookies()).get(accessCookie(dropId))!.value;
  return json(response);
});
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, token } = z
    .object({ drop_id: z.uuid(), token: z.string().refine(validToken) })
    .parse(await request.json());
  const { data, error } = await admin()
    .from('purchases')
    .select('status,drop_id,paid_at')
    .eq('drop_id', drop_id)
    .or(
      `access_token.eq.${hashToken(token)},email_access_token.eq.${hashToken(token)}`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, 'This access link is invalid.');
  const response = json({
    status: purchaseViewStatus(data),
    expires_at: purchaseExpiresAt(data),
  });
  response.cookies.set(accessCookie(drop_id), token, cookieOptions);
  return response;
});
