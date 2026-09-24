import { NavigationLink as Link } from '@/components/navigation-link';
import { UserRound, ChevronDown } from 'lucide-react';
import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';
import { AccountDropdown } from './account-dropdown';
import { ThemeToggle } from './theme-toggle';
import { SaleNotifications } from './sale-notifications';

export async function AccountMenu() {
  if (!configured())
    return (
      <>
        <ThemeToggle compact />
        <Link href="/login">Log in</Link>
      </>
    );
  const {
    data: { user },
  } = await (await supabase()).auth.getUser();
  if (!user)
    return (
      <>
        <ThemeToggle compact />
        <Link href="/login">Log in</Link>
      </>
    );
  return (
    <>
      <Link href="/dashboard">My drops</Link>
      <SaleNotifications />
      <AccountDropdown>
        <summary>
          <UserRound size={18} /> Account <ChevronDown size={14} />
        </summary>
        <div className="account-dropdown">
          <span className="hint">Signed in as</span>
          <strong>{user.email}</strong>
          <Link className="account-payout-link" href="/dashboard">
            My drops ↗
          </Link>
          <Link className="account-payout-link" href="/dashboard/payouts">
            Earnings & payouts ↗
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </AccountDropdown>
    </>
  );
}
