import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function previewBadgeLabel(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 20) return null;
  return `${count} ${count === 1 ? 'preview' : 'previews'}`;
}

export async function freePreviewBadge(count: number) {
  if (!previewBadgeLabel(count))
    throw new Error('A preview badge requires 1–20 free files.');
  // Pre-rendered using our bundled Outfit font. No font discovery or rendering
  // on the checkout request path. Regenerate with scripts/generate-preview-badges.ts.
  return readFile(
    join(process.cwd(), 'public/free-preview-badges', `${count}.png`),
  );
}
