import { canDownload } from './security';

export const PURCHASE_ACCESS_MS = 72 * 60 * 60 * 1000;
type Purchase = {
  status: string;
  drop_id: string;
  paid_at?: string | null;
  account_access?: boolean;
};
export function purchaseExpiresAt(purchase: Purchase | null) {
  const paid = purchase?.paid_at ? Date.parse(purchase.paid_at) : NaN;
  return Number.isFinite(paid)
    ? new Date(paid + PURCHASE_ACCESS_MS).toISOString()
    : null;
}
export function canAccessPurchase(
  purchase: Purchase | null,
  dropId: string,
  now = Date.now(),
) {
  const expires = purchaseExpiresAt(purchase);
  return (
    canDownload(purchase, dropId) &&
    !!expires &&
    (purchase?.account_access === true || now < Date.parse(expires))
  );
}
export function purchaseViewStatus(
  purchase: Purchase | null,
  now = Date.now(),
) {
  if (!purchase) return 'LOCKED';
  if (
    purchase.status === 'PAID' &&
    !canAccessPurchase(purchase, purchase.drop_id, now)
  )
    return 'EXPIRED';
  return purchase.status;
}
export function originalLinkLifetime(purchase: Purchase, now = Date.now()) {
  if (
    purchase.account_access &&
    canAccessPurchase(purchase, purchase.drop_id, now)
  )
    return 60;
  const expires = purchaseExpiresAt(purchase);
  return expires
    ? Math.max(0, Math.min(60, Math.floor((Date.parse(expires) - now) / 1000)))
    : 0;
}
