import sharp from 'sharp';
import { join } from 'node:path';

export function previewBadgeLabel(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 20) return null;
  return `${count} ${count === 1 ? 'preview' : 'previews'}`;
}

export async function freePreviewBadge(count: number) {
  const label = previewBadgeLabel(count);
  if (!label) throw new Error('A preview badge requires 1–20 free files.');
  // Render this narrow footer once at build time, using the site's own font.
  const { data: mask, info } = await sharp({
    text: {
      text: `<span letter_spacing="1800">${label.toUpperCase()}</span>`,
      font: 'Outfit 32',
      fontfile: join(process.cwd(), 'public/fonts/outfit-regular.ttf'),
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  const lettering = await sharp(
    Buffer.from(
      `<svg width="${info.width}" height="${info.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pink" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#f18dbd"/><stop offset=".38" stop-color="#ffc8e5"/><stop offset=".46" stop-color="#fff0f8"/><stop offset=".52" stop-color="#df629f"/><stop offset="1" stop-color="#f69dc8"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#pink)"/></svg>`,
    ),
  )
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const sparkle = Buffer.from(
    `<svg width="26" height="30" xmlns="http://www.w3.org/2000/svg"><path d="M10 7L12 14L19 16L12 18L10 25L8 18L1 16L8 14Z" fill="#fbd4e8"/><path d="M22 1L23 4L26 5L23 6L22 9L21 6L18 5L21 4Z" fill="#e989b8"/></svg>`,
  );
  return sharp({
    create: {
      width: 1000,
      height: 76,
      channels: 4,
      background: '#080709',
    },
  })
    .composite([
      {
        input: Buffer.from(
          '<svg width="1000" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1" fill="#422735"/></svg>',
        ),
        left: 0,
        top: 0,
      },
      { input: lettering, left: 40, top: Math.round((76 - info.height) / 2) },
      { input: sparkle, left: 40 + info.width + 16, top: 23 },
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
