import sharp, { type OverlayOptions } from 'sharp';
import { publicDrop } from '@/lib/public-drop';
import { freePreviewBadge } from '@/lib/preview-badge';
import { admin } from '@/lib/supabase/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const drop = await publicDrop((await params).slug);
  if (!drop) return new Response('Not found', { status: 404 });
  // The social cover only reads an already-sanitized preview, never an original.
  const layers: OverlayOptions[] = [];
  const cover = drop.assets[0];
  if (cover) {
    const { data, error } = await admin()
      .storage.from('previews')
      .download(cover.preview_path);
    if (error || !data)
      return new Response('Preview unavailable', { status: 503 });
    layers.push({
      input: await sharp(Buffer.from(await data.arrayBuffer()))
        .resize(1000, 1000, { fit: 'cover' })
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  }
  if (drop.freePreviewCount > 0) {
    layers.push({
      input: await freePreviewBadge(drop.freePreviewCount),
      left: 160,
      top: 760,
    });
  }
  const output = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: '#342947' },
  })
    .composite(layers)
    .jpeg({ quality: 85 })
    .toBuffer();
  return new Response(new Uint8Array(output), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': 'inline; filename="hidden-preview.jpg"',
    },
  });
}
