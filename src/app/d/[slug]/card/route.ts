import sharp from 'sharp';
import { publicDrop } from '@/lib/public-drop';
import { admin } from '@/lib/supabase/admin';
import { money, fileSize } from '@/lib/format';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const escape = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const drop = await publicDrop((await params).slug);
  if (!drop) return new Response('Not found', { status: 404 });
  // Only read separate, already-sanitized previews. Never read the originals bucket.
  const tiles = await Promise.all(
    drop.assets.slice(0, 2).map(async (asset, i) => {
      const { data, error } = await admin()
        .storage.from('previews')
        .download(asset.preview_path);
      if (error || !data) return null;
      const input = await sharp(Buffer.from(await data.arrayBuffer()))
        .resize(530, 300, { fit: 'cover' })
        .png()
        .toBuffer();
      return { input, left: 50 + i * 570, top: 40 };
    }),
  );
  const summary = `${drop.assets.length} hidden images · ${fileSize(drop.assets.reduce((n, a) => n + a.size_bytes, 0))} · ${money(drop.price_cents)} USD`;
  const overlay = Buffer.from(
    `<svg width="1200" height="630"><g font-family="sans-serif"><rect x="50" y="280" width="230" height="44" rx="12" fill="#241844"/><text x="72" y="310" font-size="20" fill="white">LOCKED PREVIEWS</text><text x="50" y="405" font-size="24" font-weight="bold" fill="#b5a2ff">HIDDEN</text><text x="50" y="468" font-size="42" font-weight="bold" fill="white">${escape(drop.title.slice(0, 42))}${drop.title.length > 42 ? '…' : ''}</text><text x="50" y="522" font-size="28" fill="#d4cfe3">${escape(summary)}</text><text x="50" y="580" font-size="24" fill="#b5a2ff">Tap to preview, pay, and unlock the originals →</text></g></svg>`,
  );
  const output = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#191521' },
  })
    .composite([
      ...tiles.filter((t) => t !== null),
      { input: overlay, left: 0, top: 0 },
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
