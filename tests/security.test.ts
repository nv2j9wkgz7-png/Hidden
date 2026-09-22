import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  canDownload,
  newToken,
  hashToken,
  validToken,
  safeFilename,
} from '../src/lib/security';
import { createPreview } from '../src/lib/previews';
import { dropInput, uploadInput } from '../src/lib/validation';

test('unpaid, refunded, missing, and cross-drop purchases cannot download', () => {
  assert.equal(canDownload(null, 'drop-a'), false);
  for (const status of ['PENDING', 'REFUNDED', 'LOCKED'])
    assert.equal(canDownload({ status, drop_id: 'drop-a' }, 'drop-a'), false);
  assert.equal(
    canDownload({ status: 'PAID', drop_id: 'drop-b' }, 'drop-a'),
    false,
  );
  assert.equal(
    canDownload({ status: 'PAID', drop_id: 'drop-a' }, 'drop-a'),
    true,
  );
});
test('access tokens have 256-bit randomness and only their digest is stored', () => {
  const a = newToken(),
    b = newToken();
  assert.equal(validToken(a), true);
  assert.notEqual(a, b);
  assert.notEqual(hashToken(a), a);
  assert.equal(hashToken(a).length, 64);
  for (const value of ['', null, 'a'.repeat(42), '../etc/passwd', '<script>'])
    assert.equal(validToken(value), false);
});
test('server-generated previews are separate re-encoded files without original EXIF', async () => {
  const original = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: '#7a43ee' },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'PRIVATE_ORIGINAL_METADATA' } })
    .toBuffer();
  const { preview, mime } = await createPreview(original);
  const metadata = await sharp(preview).metadata();
  assert.equal(mime, 'image/jpeg');
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 600);
  assert.equal(metadata.exif, undefined);
  assert.equal(
    preview.includes(Buffer.from('PRIVATE_ORIGINAL_METADATA')),
    false,
  );
  assert.notDeepEqual(preview, original);
});
test('SVG and invalid image content cannot become previews', async () => {
  await assert.rejects(
    createPreview(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
      ),
    ),
  );
  await assert.rejects(createPreview(Buffer.from('not an image')));
});
test('prices and upload limits are validated', () => {
  assert.equal(
    dropInput.safeParse({ title: 'Collection', price_cents: 1250 }).success,
    true,
  );
  for (const price_cents of [0, 49, 100001, 2.5])
    assert.equal(
      dropInput.safeParse({ title: 'Collection', price_cents }).success,
      false,
    );
  assert.equal(
    uploadInput.safeParse({
      drop_id: crypto.randomUUID(),
      original_filename: 'x.svg',
      mime_type: 'image/svg+xml',
      size_bytes: 12,
    }).success,
    false,
  );
  assert.equal(safeFilename('../../<bad>.jpg').includes('/'), false);
});
