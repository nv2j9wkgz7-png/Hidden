import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import {
  creator,
  handler,
  HttpError,
  json,
  ownedDrop,
  sameOrigin,
} from '@/lib/http';
import { createPreview } from '@/lib/previews';
import { MAX_BYTES } from '@/lib/validation';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const { drop_id, asset_id } = z
    .object({ drop_id: z.uuid(), asset_id: z.uuid() })
    .parse(await request.json());
  const drop = await ownedDrop(drop_id, user.id);
  const db = admin();
  const { data: asset, error } = await db
    .from('assets')
    .select('*')
    .eq('id', asset_id)
    .eq('drop_id', drop.id)
    .single();
  if (error || !asset) throw new HttpError(404, 'Image not found.');
  if (asset.status === 'READY') return json({ ready: true });
  if (drop.status !== 'DRAFT')
    throw new HttpError(409, 'Published drops cannot be changed.');
  const { data: file, error: downloadError } = await db.storage
    .from('originals')
    .download(asset.storage_path);
  if (downloadError || !file)
    throw new HttpError(409, 'Upload the original file first.');
  if (file.size > MAX_BYTES || file.size !== asset.size_bytes)
    throw new HttpError(400, 'The image size does not match the upload.');
  let result;
  try {
    result = await createPreview(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new HttpError(
      400,
      'Use a valid single-frame JPEG, PNG, or WebP image under 50 megapixels.',
    );
  }
  if (result.mime !== asset.mime_type)
    throw new HttpError(400, 'The image content does not match its file type.');
  const previewPath = `${drop.id}/${asset.id}.jpg`;
  const { error: previewError } = await db.storage
    .from('previews')
    .upload(previewPath, result.preview, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (previewError) throw previewError;
  const { error: updateError } = await db
    .from('assets')
    .update({ preview_path: previewPath, status: 'READY' })
    .eq('id', asset.id)
    .eq('status', 'UPLOADING');
  if (updateError) throw updateError;
  return json({ ready: true });
});
