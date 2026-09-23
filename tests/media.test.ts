import test from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import { createVideoPreview } from '../src/lib/video-preview';
import { uploadInput } from '../src/lib/validation';
import { uploadMime, droppedFiles } from '../src/lib/upload-files';
const run = promisify(execFile);
test('media validation enforces separate image and video limits', () => {
  const base = {
    drop_id: crypto.randomUUID(),
    original_filename: 'clip.mp4',
    size_bytes: 20 * 1024 * 1024,
  };
  assert.equal(
    uploadInput.safeParse({ ...base, mime_type: 'video/mp4' }).success,
    true,
  );
  assert.equal(
    uploadInput.safeParse({ ...base, mime_type: 'image/jpeg' }).success,
    false,
  );
  assert.equal(
    uploadInput.safeParse({
      ...base,
      mime_type: 'video/mp4',
      size_bytes: 52428801,
    }).success,
    false,
  );
  assert.equal(
    uploadInput.safeParse({ ...base, mime_type: 'text/html' }).success,
    false,
  );
  assert.equal(uploadMime({ name: 'CLIP.MOV', type: '' }), 'video/quicktime');
  assert.equal(uploadMime({ name: 'fake.mp4', type: 'text/html' }), '');
});
test('video previews decode MP4/MOV/WebM and reject renamed images or playlists', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hidn-media-test-'));
  try {
    for (const [extension, mime, codec] of [
      ['mp4', 'video/mp4', 'libx264'],
      ['mov', 'video/quicktime', 'libx264'],
      ['webm', 'video/webm', 'libvpx-vp9'],
    ]) {
      const path = join(dir, `clip.${extension}`);
      await run(ffmpeg!, [
        '-nostdin',
        '-loglevel',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=c=purple:s=160x120:d=0.2',
        '-c:v',
        codec,
        '-threads',
        '1',
        '-y',
        path,
      ]);
      const result = await createVideoPreview(await readFile(path), mime);
      const metadata = await sharp(result.preview).metadata();
      assert.equal(metadata.format, 'jpeg');
      assert.equal(metadata.width, 800);
      assert.equal(metadata.height, 600);
    }
    const image = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#fff' },
    })
      .jpeg()
      .toBuffer();
    await assert.rejects(createVideoPreview(image, 'video/mp4'));
    await assert.rejects(
      createVideoPreview(
        Buffer.from('#EXTM3U\nhttps://example.com/private'),
        'video/mp4',
      ),
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('folder traversal includes nested folders and every directory-reader batch', async () => {
  const file = (name: string) => ({
    isFile: true,
    isDirectory: false,
    file: (done: (f: File) => void) => done(new File(['x'], name)),
  });
  const directory = (batches: unknown[][]) => ({
    isFile: false,
    isDirectory: true,
    createReader: () => ({
      readEntries: (done: (v: unknown[]) => void) =>
        done(batches.shift() || []),
    }),
  });
  const root = directory([[file('one.jpg')], [directory([[file('two.mp4')]])]]);
  const result = await droppedFiles({
    items: [{ webkitGetAsEntry: () => root }],
  } as unknown as DataTransfer);
  assert.deepEqual(
    result.map((f) => f.name),
    ['one.jpg', 'two.mp4'],
  );
});
