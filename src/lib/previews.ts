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
  // Vector paths render consistently without relying on server-installed fonts.
  const watermark = await sharp(`${process.cwd()}/public/hidn-arrow-mark.svg`)
    .resize(104, 118, { fit: 'contain', background: '#00000000' })
    .modulate({ brightness: 1.2 })
    .png()
    .toBuffer();
  const glow = await sharp(watermark)
    .extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: '#00000000',
    })
    .blur(8)
    .png()
    .toBuffer();
  return {
    preview: await sharp(blurred)
      .composite([
        { input: glow, left: 332, top: 225 },
        { input: watermark, left: 348, top: 241 },
      ])
      .jpeg({ quality: 65 })
      .toBuffer(),
    mime: `image/${metadata.format}`,
  };
}
