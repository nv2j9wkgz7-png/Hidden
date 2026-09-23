import Link from 'next/link';
import { UserRound, ChevronDown, LogOut } from 'lucide-react';
import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';

export async function AccountMenu() {
  if (!configured()) return null;
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user) return null;
  return (
    <details className="account-menu">
      <summary>
        <UserRound size={18} /> Account <ChevronDown size={14} />
      </summary>
      <div className="account-dropdown">
        <span className="hint">Signed in as</span>
        <strong>{user.email}</strong>
        <Link className="account-payout-link" href="/dashboard/payouts">
          Earnings & payouts ↗
        </Link>
        <form action="/auth/logout" method="post">
          <button type="submit">
            <LogOut size={16} /> Log out
          </button>
        </form>
      </div>
    </details>
  );
}
