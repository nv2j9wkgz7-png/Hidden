import sharp from 'sharp';
import { join } from 'node:path';

export function previewBadgeLabel(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 20) return null;
  return `${count} ${count === 1 ? 'preview' : 'previews'}`;
}

export async function freePreviewBadge(count: number) {
  const label = previewBadgeLabel(count);
  if (!label) throw new Error('A preview badge requires 1–20 free files.');
  // Bundle the same font as the site; don't depend on fonts installed on the host.
  const { data: mask, info } = await sharp({
    text: {
      text: label,
      font: 'Outfit SemiBold 76',
      fontfile: join(process.cwd(), 'public/fonts/outfit-semibold.ttf'),
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lettering = await sharp(
    Buffer.from(
      `<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pink" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4fc"/><stop offset=".38" stop-color="#ffbfea"/><stop offset=".47" stop-color="#fff2fc"/><stop offset=".53" stop-color="#ed70c1"/><stop offset="1" stop-color="#ffb1e5"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#pink)"/></svg>`,
    ),
  )
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const glow = await sharp(lettering)
    .extend({
      top: 12,
      bottom: 12,
      left: 12,
      right: 12,
      background: '#00000000',
    })
    .tint('#24122e')
    .blur(4)
    .png()
    .toBuffer();
  const left = Math.round((680 - info.width) / 2),
    top = Math.round((150 - info.height) / 2);
  return sharp({
    create: {
      width: 680,
      height: 150,
      channels: 4,
      background: '#00000000',
    },
  })
    .composite([
      { input: glow, left: left - 12, top: top - 12 },
      { input: lettering, left, top },
    ])
    .png()
    .toBuffer();
}

// Run with: node --import tsx scripts/generate-preview-badges.ts
const { writeFile, mkdir } = await import('node:fs/promises');
await mkdir('public/free-preview-badges', { recursive: true });
for (let count = 1; count <= 20; count++) {
  await writeFile(
    `public/free-preview-badges/${count}.png`,
    await freePreviewBadge(count),
  );
}
