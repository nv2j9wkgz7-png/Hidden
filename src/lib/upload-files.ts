import { MEDIA_TYPES } from './validation';
export function uploadMime(file: Pick<File, 'type' | 'name'>) {
  if ((MEDIA_TYPES as readonly string[]).includes(file.type)) return file.type;
  if (file.type && file.type !== 'application/octet-stream') return '';
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return (
    (
      {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm',
      } as Record<string, string>
    )[extension] || ''
  );
}
// DirectoryReader may return multiple batches; keep walking nested folders.
export async function droppedFiles(transfer: DataTransfer) {
  const entries = Array.from(transfer.items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry);
  if (!entries.length) return Array.from(transfer.files);
  const files: File[] = [];
  let visited = 0;
  async function walk(entry: FileSystemEntry): Promise<void> {
    if (++visited > 2000)
      throw new Error(
        'This folder is too large to scan. Choose a smaller folder.',
      );
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      while (true) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          reader.readEntries(resolve, reject),
        );
        if (!batch.length) break;
        for (const child of batch) await walk(child);
      }
    }
  }
  for (const entry of entries) await walk(entry);
  return files;
}
