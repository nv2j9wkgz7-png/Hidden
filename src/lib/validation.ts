import { z } from 'zod';
export const MAX_IMAGES = 20;
export const MAX_BYTES = 10 * 1024 * 1024;
export const uuid = z.uuid();
export const dropInput = z.object({
  title: z.string().trim().min(1).max(100),
  price_cents: z.number().int().min(50).max(100000),
});
export const uploadInput = z.object({
  drop_id: uuid,
  original_filename: z.string().min(1).max(255),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size_bytes: z.number().int().min(1).max(MAX_BYTES),
});
