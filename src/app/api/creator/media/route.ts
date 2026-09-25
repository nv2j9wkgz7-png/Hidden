import { z } from 'zod';
import { admin } from '@/lib/supabase/admin';
import { creator, handler, HttpError, ownedDrop } from '@/lib/http';
import { createThumbnail, thumbnailPath } from '@/lib/previews';
import { createVideoPreview } from '@/lib/video-preview';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Creator-only media: thumbnails never enter the public preview bucket.
export const GET = handler(async (request) => {
  const user = await creator();
  const params = new URL(request.url).searchParams;
  const id = z.uuid().parse(params.get('asset_id'));
  const db = admin();
  const { data: asset, error } = await db
    .from('assets')
    .select('drop_id,storage_path,mime_type')
    .eq('id', id)
    .eq('status', 'READY')
    .maybeSingle();
  if (error) throw error;
  if (!asset) throw new HttpError(404, 'File not found.');
  await ownedDrop(asset.drop_id, user.id);
  const bucket = db.storage.from('originals');
  if (params.get('view') === 'original') {
    const { data, error } = await bucket.createSignedUrl(
      asset.storage_path,
      60,
    );
    if (error) throw error;
    return new Response(null, {
      status: 307,
      headers: {
        Location: data.signedUrl,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  const path = thumbnailPath(asset.storage_path);
  const cached = await bucket.download(path);
  let bytes: Buffer;
  if (cached.data) bytes = Buffer.from(await cached.data.arrayBuffer());
  else {
    const original = await bucket.download(asset.storage_path);
    if (original.error || !original.data)
      throw new HttpError(404, 'File not found.');
    const input = Buffer.from(await original.data.arrayBuffer());
    bytes = asset.mime_type.startsWith('video/')
      ? (await createVideoPreview(input, asset.mime_type)).thumbnail
      : await createThumbnail(input);
    const saved = await bucket.upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (saved.error) throw saved.error;
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
});
