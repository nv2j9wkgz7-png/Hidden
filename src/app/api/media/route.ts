import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, rateLimit } from '@/lib/http';
import { purchaseAccess } from '@/lib/access';
import { canAccessPurchase, originalLinkLifetime } from '@/lib/purchase-window';

// The stable viewer URL checks paid access each time, then issues a short-lived
// inline URL. Private originals never enter the public drop's server props.
export const GET = handler(async (request) => {
  const { drop_id, asset_id } = z
    .object({
      drop_id: z.uuid(),
      asset_id: z.uuid(),
    })
    .parse(Object.fromEntries(new URL(request.url).searchParams));
  const purchase = await purchaseAccess(drop_id);
  if (!canAccessPurchase(purchase, drop_id))
    throw new HttpError(
      403,
      'Log in to your saved purchase or use an unexpired paid guest link to view files.',
    );
  await rateLimit(`media:${purchase!.id}`, 600);
  const db = admin();
  const { data: asset, error } = await db
    .from('assets')
    .select('storage_path')
    .eq('id', asset_id)
    .eq('drop_id', drop_id)
    .eq('status', 'READY')
    .maybeSingle();
  if (error) throw error;
  if (!asset) throw new HttpError(404, 'File not found.');
  const lifetime = originalLinkLifetime(purchase!);
  if (!lifetime)
    throw new HttpError(410, 'Your 72-hour access window has ended.');
  const { data: signed, error: signError } = await db.storage
    .from('originals')
    .createSignedUrl(asset.storage_path, lifetime);
  if (signError) throw signError;
  return new Response(null, {
    status: 307,
    headers: {
      Location: signed.signedUrl,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
