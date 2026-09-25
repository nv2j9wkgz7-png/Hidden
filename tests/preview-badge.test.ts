import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { freePreviewBadge, previewBadgeLabel } from '../src/lib/preview-badge';
test('social badge omits zero previews and renders singular/plural with the bundled font', async () => {
  for (const count of [0, -1, 21, NaN, 1.5])
    assert.equal(previewBadgeLabel(count), null);
  assert.equal(previewBadgeLabel(1), '1 preview');
  assert.equal(previewBadgeLabel(3), '3 previews');
  for (const count of [1, 20]) {
    const result = await freePreviewBadge(count);
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.width, 680);
    assert.equal(metadata.height, 150);
  }
});
