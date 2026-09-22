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
import { uploadInput } from '@/lib/validation';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  const input = uploadInput
    .extend({ asset_id: z.uuid().optional() })
    .parse(await request.json());
  const drop = await ownedDrop(input.drop_id, user.id);
  if (drop.status !== 'DRAFT')
    throw new HttpError(409, 'Published drops cannot be changed.');
  const db = admin();
  let asset;
  if (input.asset_id) {
    const { data, error } = await db
      .from('assets')
      .select('*')
      .eq('id', input.asset_id)
      .eq('drop_id', drop.id)
      .eq('status', 'UPLOADING')
      .single();
    if (error || !data)
      throw new HttpError(404, 'Unfinished upload not found.');
    if (
      data.size_bytes !== input.size_bytes ||
      data.original_filename !== input.original_filename
    )
      throw new HttpError(400, 'Select the same file to resume this upload.');
    asset = data;
  } else {
    const { data, error } = await db.rpc('reserve_asset', {
      p_drop: drop.id,
      p_creator: user.id,
      p_filename: input.original_filename,
      p_mime: input.mime_type,
      p_size: input.size_bytes,
    });
    if (error) throw error;
    asset = data;
  }
  const { data, error } = await db.storage
    .from('originals')
    .createSignedUploadUrl(asset.storage_path, { upsert: false });
  if (error) throw error;
  return json({ asset_id: asset.id, upload_url: data.signedUrl });
});
