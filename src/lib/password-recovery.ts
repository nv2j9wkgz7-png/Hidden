import { z } from 'zod';
import { loginDestination } from './login-destination';

export const newPasswordInput = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(128, 'Use no more than 128 characters.'),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    message: 'Your passwords do not match.',
    path: ['confirmation'],
  });

// Only provider-verified recovery results select the password screen.
// Never redirect to arbitrary caller-supplied URLs.
export function authCallbackDestination({
  failed,
  redirectType,
  next,
}: {
  failed: boolean;
  redirectType?: string | null;
  next?: string | null;
}) {
  if (failed) return '/login?error=confirmation';
  if (redirectType === 'recovery') return '/reset-password';
  return loginDestination(next);
}
