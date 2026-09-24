import { dropModeration } from '@/lib/moderation';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { handler, HttpError, json, sameOrigin } from '@/lib/http';
import { accessCookie, validToken } from '@/lib/security';
import { cookieOptions, purchaseAccess, guestPurchase } from '@/lib/access';
import { pendingCookie } from '@/lib/purchase-device';
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
  const candidate = purchase ? null : await guestPurchase(dropId);
  const candidateStatus = purchaseViewStatus(candidate?.purchase ?? null);
  const response: {
    status: string;
    token?: string;
    expires_at: string | null;
    account_saved: boolean;
    library_url?: string;
  } = {
    status: purchase
      ? purchaseViewStatus(purchase)
      : candidateStatus === 'PAID'
        ? 'VERIFICATION_REQUIRED'
        : candidateStatus,
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
  const guest = await guestPurchase(drop_id, token);
  if (!guest) throw new HttpError(403, 'This access link is invalid.');
  const existing = await purchaseAccess(drop_id);
  const state = purchaseViewStatus(guest.purchase);
  const response = json({
    status:
      existing && existing.id === guest.purchase.id
        ? purchaseViewStatus(existing)
        : state === 'PAID'
          ? 'VERIFICATION_REQUIRED'
          : state,
    expires_at: purchaseExpiresAt(guest.purchase),
  });
  // A URL identifies the purchase, but never establishes a trusted browser.
  response.cookies.set(pendingCookie(drop_id), token, {
    ...cookieOptions,
    maxAge: 72 * 3600,
  });
  return response;
});
