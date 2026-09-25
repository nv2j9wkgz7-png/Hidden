import { activeCreator } from '@/lib/moderation';
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
import { createPreview, thumbnailPath } from '@/lib/previews';
import { mediaLimit } from '@/lib/validation';
import { createVideoPreview } from '@/lib/video-preview';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await activeCreator();
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
  if (error || !asset) throw new HttpError(404, 'File not found.');
  if (asset.status === 'READY') return json({ ready: true });
  if (drop.status !== 'DRAFT')
    throw new HttpError(409, 'Published drops cannot be changed.');
  const { data: file, error: downloadError } = await db.storage
    .from('originals')
    .download(asset.storage_path);
  if (downloadError || !file)
    throw new HttpError(409, 'Upload the original file first.');
  if (file.size > mediaLimit(asset.mime_type) || file.size !== asset.size_bytes)
    throw new HttpError(400, 'The file size does not match the upload.');
  let result;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    result = asset.mime_type.startsWith('video/')
      ? await createVideoPreview(bytes, asset.mime_type)
      : await createPreview(bytes);
  } catch {
    throw new HttpError(
      400,
      'Could not process this file. Use a JPEG, PNG, WebP image or a playable MP4, MOV, or WebM video.',
    );
  }
  if (result.mime !== asset.mime_type)
    throw new HttpError(400, 'The file content does not match its file type.');
  const { error: thumbnailError } = await db.storage
    .from('originals')
    .upload(thumbnailPath(asset.storage_path), result.thumbnail, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (thumbnailError) throw thumbnailError;
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
  if (updateError) {
    await db.storage.from('previews').remove([previewPath]);
    throw updateError;
  }
  return json({ ready: true });
});
