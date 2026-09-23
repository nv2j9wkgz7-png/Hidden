import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { createPreview } from './previews';
const run = promisify(execFile);

export async function createVideoPreview(original: Buffer, mime: string) {
  // Reject images, playlists and arbitrary files before invoking a forced demuxer.
  const iso = original.toString('ascii', 4, 8) === 'ftyp';
  const webm = original
    .subarray(0, 4)
    .equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (
    !ffmpeg ||
    !(mime === 'video/webm'
      ? webm
      : ['video/mp4', 'video/quicktime'].includes(mime) && iso)
  )
    throw new Error('Use an MP4, MOV, or WebM video.');
  const directory = await mkdtemp(join(tmpdir(), 'hidn-video-'));
  try {
    const input = join(directory, 'original');
    const output = join(directory, 'frame.jpg');
    await writeFile(input, original);
    await run(
      ffmpeg!,
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-max_alloc',
        '134217728',
        '-threads',
        '1',
        '-protocol_whitelist',
        'file,pipe',
        '-f',
        mime === 'video/webm' ? 'matroska' : 'mov',
        '-i',
        input,
        '-map',
        '0:V:0',
        '-frames:v',
        '1',
        '-an',
        '-vf',
        'scale=1280:1280:force_original_aspect_ratio=decrease',
        '-threads',
        '1',
        '-y',
        output,
      ],
      { timeout: 25000, killSignal: 'SIGKILL', maxBuffer: 256 * 1024 },
    );
    const result = await createPreview(await readFile(output));
    return { preview: result.preview, mime };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
