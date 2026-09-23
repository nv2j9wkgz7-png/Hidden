import { z } from 'zod';
export const MAX_IMAGES = 20;
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_DROP_BYTES = 200 * 1024 * 1024;
export const MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;
export function mediaLimit(mime: string) {
  return mime.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_BYTES;
}
export const uuid = z.uuid();
export const dropInput = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).default(''),
  price_cents: z.number().int().min(50).max(100000),
});
export const uploadInput = z
  .object({
    drop_id: uuid,
    original_filename: z.string().min(1).max(255),
    mime_type: z.enum(MEDIA_TYPES),
    size_bytes: z.number().int().min(1).max(MAX_VIDEO_BYTES),
  })
  .refine((input) => input.size_bytes <= mediaLimit(input.mime_type), {
    message: 'Images can be up to 10 MB; videos up to 50 MB.',
  });
