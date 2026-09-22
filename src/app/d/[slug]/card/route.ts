import sharp, { type OverlayOptions } from 'sharp';
import { publicDrop } from '@/lib/public-drop';
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
        .blur(12)
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    });
  }
  // Same H silhouette as the Hidden brand mark, in white for a legible watermark.
  const watermark = Buffer.from(
    `<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="1000" height="1000" fill="#171020" opacity=".18"/><g transform="translate(324 300) scale(.4) translate(-175 -110)"><path d="M215 155H465V536H786V155H1040V1096H786V720H465V1096H215Z" fill="#171020" opacity=".6" filter="url(#shadow)"/><path d="M215 155H465V536H786V155H1040V1096H786V720H465V1096H215Z" fill="white" opacity=".9"/></g><text x="500" y="790" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="30" letter-spacing="9" fill="white">HIDDEN</text></svg>`,
  );
  const output = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: '#342947' },
  })
    .composite([...layers, { input: watermark, left: 0, top: 0 }])
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
