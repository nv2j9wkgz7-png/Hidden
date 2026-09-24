import { z } from 'zod';
export const reportCategories = {
  UNDERAGE: 'Concern involving a minor',
  NONCONSENSUAL: 'Non-consensual or private content',
  COPYRIGHT: 'Copyright or ownership concern',
  SCAM: 'Scam or misleading content',
  OTHER: 'Something else',
} as const;
export const reportInput = z.object({
  drop_id: z.uuid(),
  category: z.enum(['UNDERAGE', 'NONCONSENSUAL', 'COPYRIGHT', 'SCAM', 'OTHER']),
  details: z
    .string()
    .trim()
    .min(10, 'Please include at least 10 characters.')
    .max(2000),
  contact_email: z
    .union([z.literal(''), z.string().trim().email().max(254)])
    .optional(),
});
