import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json, sameOrigin, rateLimit } from '@/lib/http';
import { purchaseAccess } from '@/lib/access';
import { safeFilename } from '@/lib/security';
import { canAccessPurchase, originalLinkLifetime } from '@/lib/purchase-window';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, asset_id } = z
    .object({ drop_id: z.uuid(), asset_id: z.uuid().optional() })
    .parse(await request.json());
  const purchase = await purchaseAccess(drop_id);
  if (!canAccessPurchase(purchase, drop_id))
    throw new HttpError(
      403,
      'Log in to your saved purchase or use an unexpired paid guest link to download files.',
    );
  await rateLimit(`download:${purchase!.id}`, 120);
  const db = admin();
  let query = db
    .from('assets')
    .select('id,storage_path,original_filename,sort_order')
    .eq('drop_id', drop_id)
    .eq('status', 'READY')
    .order('sort_order');
  if (asset_id) query = query.eq('id', asset_id);
  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) throw new HttpError(404, 'Image not found.');
  const lifetime = originalLinkLifetime(purchase!);
  if (!lifetime)
    throw new HttpError(410, 'Your 72-hour access window has ended.');
  const files = await Promise.all(
    data.map(async (asset) => {
      const filename = `${String(asset.sort_order + 1).padStart(2, '0')}-${safeFilename(asset.original_filename)}`;
      const { data: signed, error } = await db.storage
        .from('originals')
        .createSignedUrl(asset.storage_path, lifetime, { download: filename });
      if (error) throw error;
      return { id: asset.id, filename, url: signed.signedUrl };
    }),
  );
  return json({ files, expires_in: lifetime });
});
