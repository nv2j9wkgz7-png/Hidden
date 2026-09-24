import { z } from 'zod';
export const recoveryEmail = z
  .string()
  .trim()
  .max(254)
  .email()
  .transform((value) => value.toLowerCase());
export const RECOVERY_COOKIE = 'hidn_purchase_recovery';
export function maskRecoveryEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}•••@${domain}`;
}
