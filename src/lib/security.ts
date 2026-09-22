import { createHash, randomBytes } from 'node:crypto';
export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const accessCookie = (dropId: string) => `drop_access_${dropId}`;
export function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
export function safeFilename(name: string) {
  return (
    name
      .replace(/[^a-zA-Z0-9._ -]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 120) || 'image'
  );
}
export function canDownload(
  purchase: { status: string; drop_id: string } | null,
  dropId: string,
) {
  return (
    !!purchase && purchase.status === 'PAID' && purchase.drop_id === dropId
  );
}
