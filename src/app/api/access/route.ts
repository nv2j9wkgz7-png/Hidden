import { z } from 'zod';
import { cookies } from 'next/headers';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json, sameOrigin } from '@/lib/http';
import { accessCookie, hashToken, validToken } from '@/lib/security';
import { cookieOptions, purchaseAccess } from '@/lib/access';
export const GET = handler(async (request) => {
  const dropId = z
    .uuid()
    .parse(new URL(request.url).searchParams.get('drop_id'));
  const purchase = await purchaseAccess(dropId);
  const response: { status: string; token?: string } = {
    status: purchase?.status || 'LOCKED',
  };
  // Requested explicitly by the buyer to save their private recovery link.
  if (
    purchase?.status === 'PAID' &&
    new URL(request.url).searchParams.get('recovery') === '1'
  )
    response.token = (await cookies()).get(accessCookie(dropId))!.value;
  return json(response);
});
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, token } = z
    .object({ drop_id: z.uuid(), token: z.string().refine(validToken) })
    .parse(await request.json());
  const { data, error } = await admin()
    .from('purchases')
    .select('status')
    .eq('drop_id', drop_id)
    .or(
      `access_token.eq.${hashToken(token)},email_access_token.eq.${hashToken(token)}`,
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, 'This access link is invalid.');
  const response = json({ status: data.status });
  response.cookies.set(accessCookie(drop_id), token, cookieOptions);
  return response;
});
