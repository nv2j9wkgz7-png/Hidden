import 'server-only';
import { dropModeration } from './moderation';
import { cookies } from 'next/headers';
import { admin } from './supabase/admin';
import { accessCookie, hashToken, validToken } from './security';
import { env } from './env';
import {
  deviceCookie,
  pendingCookie,
  readDeviceProof,
  normalizeCheckoutEmail,
} from './purchase-device';
import { supabase } from './supabase/server';
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};
const purchaseFields =
  'id,buyer_id,drop_id,status,paid_at,customer_email,payment_provider,payment_provider_transaction_id,stripe_account_id';
export async function guestPurchase(dropId: string, token?: string) {
  const jar = await cookies();
  const raw =
    token ??
    jar.get(pendingCookie(dropId))?.value ??
    jar.get(accessCookie(dropId))?.value;
  if (!validToken(raw)) return null;
  const { data, error } = await admin()
    .from('purchases')
    .select(purchaseFields)
    .eq('drop_id', dropId)
    .or(
      `access_token.eq.${hashToken(raw)},email_access_token.eq.${hashToken(raw)}`,
    )
    .maybeSingle();
  if (error) throw error;
  return data ? { purchase: data, token: raw } : null;
}
export async function purchaseAccess(dropId: string) {
  if ((await dropModeration(dropId))?.moderation_state === 'REMOVED')
    return null;
  const fields = purchaseFields;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (user) {
    const { data, error } = await admin()
      .from('purchases')
      .select(fields)
      .eq('drop_id', dropId)
      .eq('buyer_id', user.id)
      .eq('status', 'PAID')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return { ...data, account_access: true, email_verified: false };
  }
  const jar = await cookies();
  const raw = jar.get(accessCookie(dropId))?.value;
  if (!validToken(raw)) return null;
  const guest = await guestPurchase(dropId, raw);
  if (!guest) return null;
  const proof = readDeviceProof(
    jar.get(deviceCookie(dropId))?.value,
    guest.purchase.id,
    raw,
    env('EMAIL_ACCESS_SECRET'),
  );
  if (!proof) return null;
  return {
    ...guest.purchase,
    account_access: false,
    email_verified:
      !!guest.purchase.customer_email &&
      proof.email ===
        hashToken(normalizeCheckoutEmail(guest.purchase.customer_email)),
  };
}
