import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { handler, HttpError, json, sameOrigin, rateLimit } from '@/lib/http';
import { purchaseAccess } from '@/lib/access';
import { canDownload, safeFilename } from '@/lib/security';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const { drop_id, asset_id } = z
    .object({ drop_id: z.uuid(), asset_id: z.uuid().optional() })
    .parse(await request.json());
  const purchase = await purchaseAccess(drop_id);
  if (!canDownload(purchase, drop_id))
    throw new HttpError(
      403,
      'A confirmed payment is required to download originals.',
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
  const files = await Promise.all(
    data.map(async (asset) => {
      const filename = `${String(asset.sort_order + 1).padStart(2, '0')}-${safeFilename(asset.original_filename)}`;
      const { data: signed, error } = await db.storage
        .from('originals')
        .createSignedUrl(asset.storage_path, 60, { download: filename });
      if (error) throw error;
      return { id: asset.id, filename, url: signed.signedUrl };
    }),
  );
  return json({ files, expires_in: 60 });
});
