import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadFiles, type UploadItem } from '../src/lib/upload-queue';
const file = (key: string): UploadItem => ({
  key,
  name: `${key}.jpg`,
  size: 4,
  mime: 'image/jpeg',
  file: new File(['test'], `${key}.jpg`),
  ready: false,
});
test('a failed upload does not stop the batch; retry uploads only that file and preserves order', async () => {
  const items = [
    { ...file('saved'), id: 'saved', ready: true },
    file('first'),
    file('second'),
  ];
  const uploads: string[] = [],
    progress: number[] = [];
  let fail = true;
  const finalized = new Set<string>();
  const dependencies = {
    request: async (path: string, body: unknown) => {
      const data = body as { asset_id?: string; original_filename?: string };
      if (path.endsWith('/uploads'))
        return {
          asset_id: data.asset_id || data.original_filename,
          upload_url: data.original_filename,
        };
      if (path.endsWith('/finalize')) {
        if (!finalized.has(data.asset_id!)) throw new Error('Not uploaded');
        return {};
      }
      throw new Error('Unexpected route');
    },
    upload: async (
      url: string,
      _file: File,
      _mime: string,
      report: (n: number) => void,
    ) => {
      uploads.push(url);
      report(25);
      report(75);
      if (fail && url === 'first.jpg') throw new Error('Offline');
      finalized.add(url);
      report(100);
    },
  };
  await uploadFiles(
    items,
    'drop',
    (i) => {
      if (i.percent) progress.push(i.percent);
    },
    {},
    dependencies,
  );
  assert.deepEqual(uploads, ['first.jpg', 'second.jpg']);
  assert.equal(items[1].failure, 'Offline');
  assert.equal(items[2].ready, true);
  assert.ok(progress.includes(25));
  fail = false;
  await uploadFiles(
    items,
    'drop',
    () => {},
    { retryKey: 'first' },
    dependencies,
  );
  assert.deepEqual(uploads, ['first.jpg', 'second.jpg', 'first.jpg']);
  assert.ok(items.every((i) => i.ready));
  assert.deepEqual(
    items.map((i) => i.key),
    ['saved', 'first', 'second'],
  );
});
test('a lost upload response is recovered by finalize without sending the file again', async () => {
  const items = [{ ...file('existing'), id: 'asset' }];
  let transfers = 0;
  await uploadFiles(
    items,
    'drop',
    () => {},
    {},
    {
      request: async (path) => {
        assert.ok(path.endsWith('/finalize'));
        return {};
      },
      upload: async () => {
        transfers++;
      },
    },
  );
  assert.equal(items[0].ready, true);
  assert.equal(transfers, 0);
});
