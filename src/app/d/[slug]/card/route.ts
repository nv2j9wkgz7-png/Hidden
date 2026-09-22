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
  // Reuse the exact colored logo shown in the site header.
  const logo = await sharp(`${process.cwd()}/public/hidden-logo.svg`)
    .resize(180, 204, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .modulate({ brightness: 1.25, saturation: 1.08 })
    .png()
    .toBuffer();
  const watermark = Buffer.from(
    `<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1000" fill="#171020" opacity=".18"/></svg>`,
  );
  const glow = Buffer.from(
    `<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><defs><filter id="halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="65"/></filter><filter id="soft"><feGaussianBlur stdDeviation="6"/></filter></defs><g transform="translate(410 398) scale(.199) translate(-175 -110)"><path d="M215 155H465V536H786V155H1040V1096H786V720H465V1096H215Z" fill="#eee5ff" opacity=".85" filter="url(#halo)"/><path d="M215 155H465V536H786V155H1040V1096H786V720H465V1096H215Z" fill="white" opacity=".8" filter="url(#soft)"/></g></svg>`,
  );
  const output = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: '#342947' },
  })
    .composite([
      ...layers,
      { input: watermark, left: 0, top: 0 },
      { input: glow, left: 0, top: 0 },
      { input: logo, left: 410, top: 398 },
    ])
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
