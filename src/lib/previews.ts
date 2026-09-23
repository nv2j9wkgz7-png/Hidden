import sharp from 'sharp';
export async function createPreview(original: Buffer) {
  const input = sharp(original, {
    limitInputPixels: 50_000_000,
    failOn: 'warning',
  });
  const metadata = await input.metadata();
  if (
    !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
    (metadata.pages || 1) > 1
  )
    throw new Error(
      'Use a single-frame JPEG, PNG, or WebP image under 50 megapixels.',
    );
  // Decode and re-encode: no EXIF, embedded thumbnails, or original bytes survive.
  const small = await input
    .rotate()
    .resize(40, 40, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  const blurred = await sharp(small)
    .resize(800, 600, { fit: 'contain', background: '#151820' })
    .blur(8)
    .jpeg({ quality: 55 })
    .toBuffer();
  const watermark = Buffer.from(
    '<svg width="800" height="600"><rect x="280" y="266" width="240" height="68" rx="34" fill="#111827" fill-opacity=".75"/><text x="400" y="308" font-family="sans-serif" font-size="22" text-anchor="middle" fill="white">LOCKED PREVIEW</text></svg>',
  );
  return {
    preview: await sharp(blurred)
      .composite([{ input: watermark }])
      .jpeg({ quality: 65 })
      .toBuffer(),
    mime: `image/${metadata.format}`,
  };
}
