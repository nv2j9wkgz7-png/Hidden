import { createHmac, timingSafeEqual } from 'node:crypto';
import { hashToken } from './security';

export const deviceCookie = (dropId: string) => `drop_device_${dropId}`;
export const pendingCookie = (dropId: string) => `drop_pending_${dropId}`;
export const challengeCookie = (dropId: string) => `drop_challenge_${dropId}`;
export const CODE_LIFETIME_SECONDS = 600;
export const CHECKOUT_DEVICE_SECONDS = 7 * 24 * 60 * 60;
export const normalizeCheckoutEmail = (email: string) =>
  email.trim().toLowerCase();
function mac(value: string, secret: string) {
  if (secret.length < 32)
    throw new Error('Purchase verification secret is unavailable.');
  return createHmac('sha256', secret).update(value).digest('hex');
}
type DeviceProof = {
  purchase: string;
  credential: string;
  expires: number;
  email?: string;
};
export function signDeviceProof(
  purchaseId: string,
  token: string,
  expires: number,
  secret: string,
  email?: string,
) {
  const payload = Buffer.from(
    JSON.stringify({
      purchase: purchaseId,
      credential: hashToken(token),
      expires,
      ...(email ? { email: hashToken(normalizeCheckoutEmail(email)) } : {}),
    }),
  ).toString('base64url');
  return `${payload}.${mac(`hidn:purchase-device:v1:${payload}`, secret)}`;
}
export function readDeviceProof(
  value: string | undefined,
  purchaseId: string,
  token: string,
  secret: string,
  now = Date.now(),
): DeviceProof | null {
  if (!value || value.length > 1024) return null;
  const [payload, signature, extra] = value.split('.');
  if (extra || !payload || !/^[a-f0-9]{64}$/.test(signature || '')) return null;
  const expected = mac(`hidn:purchase-device:v1:${payload}`, secret);
  if (
    !timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex'),
    )
  )
    return null;
  try {
    const proof = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as DeviceProof;
    if (
      proof.purchase !== purchaseId ||
      proof.credential !== hashToken(token) ||
      !Number.isFinite(proof.expires) ||
      proof.expires <= now
    )
      return null;
    return proof;
  } catch {
    return null;
  }
}
export function verificationCodeHash(
  challenge: string,
  purchaseId: string,
  code: string,
  secret: string,
) {
  // Domain separated from recovery links and device proofs. The code alone is
  // not an offline dictionary target, even with a copy of the recovery table.
  return mac(
    `hidn:purchase-code:v1:${challenge}:${purchaseId}:${code}`,
    secret,
  );
}
