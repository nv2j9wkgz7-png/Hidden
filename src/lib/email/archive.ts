import { zipSync } from 'fflate';
import { safeFilename } from '../security';

// Leave headroom for base64 encoding and common recipient mailbox limits.
export const EMAIL_ZIP_LIMIT = 15 * 1024 * 1024;
type File = {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  sort_order: number;
};
export async function emailArchive(
  files: File[],
  read: (path: string) => Promise<Uint8Array>,
) {
  if (
    !files.length ||
    files.reduce((n, file) => n + file.size_bytes, 0) > EMAIL_ZIP_LIMIT - 65536
  )
    return null;
  const entries: Record<string, Uint8Array> = {};
  let total = 0;
  for (const file of files) {
    const bytes = await read(file.storage_path);
    total += bytes.byteLength;
    if (total > EMAIL_ZIP_LIMIT - 65536) return null;
    entries[
      `${String(file.sort_order + 1).padStart(2, '0')}-${safeFilename(file.original_filename)}`
    ] = bytes;
  }
  const zip = zipSync(entries, {
    level: 0,
    mtime: new Date('2000-01-01T12:00:00Z'),
  });
  return zip.byteLength <= EMAIL_ZIP_LIMIT ? zip : null;
}
