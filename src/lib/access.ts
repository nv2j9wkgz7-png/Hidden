import 'server-only';
import { cookies } from 'next/headers';
import { admin } from './supabase/admin';
import { accessCookie, hashToken, validToken } from './security';
import { supabase } from './supabase/server';
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};
export async function purchaseAccess(dropId: string) {
  const fields =
    'id,buyer_id,drop_id,status,paid_at,payment_provider,payment_provider_transaction_id,stripe_account_id';
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
    if (data) return { ...data, account_access: true };
  }
  const raw = (await cookies()).get(accessCookie(dropId))?.value;
  if (!validToken(raw)) return null;
  const { data, error } = await admin()
    .from('purchases')
    .select(fields)
    .eq('drop_id', dropId)
    .or(
      `access_token.eq.${hashToken(raw)},email_access_token.eq.${hashToken(raw)}`,
    )
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, account_access: false } : null;
}
