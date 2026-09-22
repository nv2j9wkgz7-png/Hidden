import 'server-only';
import { cookies } from 'next/headers';
import { admin } from './supabase/admin';
import { accessCookie, hashToken, validToken } from './security';
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};
export async function purchaseAccess(dropId: string) {
  const raw = (await cookies()).get(accessCookie(dropId))?.value;
  if (!validToken(raw)) return null;
  const { data, error } = await admin()
    .from('purchases')
    .select(
      'id,drop_id,status,payment_provider,payment_provider_transaction_id',
    )
    .eq('drop_id', dropId)
    .eq('access_token', hashToken(raw))
    .maybeSingle();
  if (error) throw error;
  return data;
}
