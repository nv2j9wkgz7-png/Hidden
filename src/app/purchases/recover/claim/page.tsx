import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { admin } from '@/lib/supabase/admin';
import { supabase } from '@/lib/supabase/server';
import { hashToken, validToken } from '@/lib/security';
import { RECOVERY_COOKIE, maskRecoveryEmail } from '@/lib/purchase-recovery';
import { ClaimRecoveredPurchases } from '@/components/purchase-recovery';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Claim your purchases' };
export default async function Claim() {
  const token = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!validToken(token)) redirect('/purchases/recover?expired=1');
  const { data: proof, error } = await admin()
    .from('purchase_recoveries')
    .select('email,used_at,used_by')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!proof) redirect('/purchases/recover?expired=1');
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) redirect('/login?next=%2Fpurchases%2Frecover%2Fclaim');
  if (proof.used_at)
    redirect(
      proof.used_by === user.id ? '/purchases' : '/purchases/recover?expired=1',
    );
  return (
    <section className="recovery-layout">
      <ClaimRecoveredPurchases
        checkoutEmail={maskRecoveryEmail(proof.email)}
        accountEmail={user.email || 'your signed-in account'}
      />
    </section>
  );
}
