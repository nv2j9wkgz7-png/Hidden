import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { NewPasswordForm } from '@/components/password-recovery';
import { NavigationLink as Link } from '@/components/navigation-link';
import { supabase } from '@/lib/supabase/server';

export const metadata = { title: 'Reset password' };
export default async function ResetPassword() {
  if (!configured()) return <Setup />;
  const {
    data: { user },
    error,
  } = await (await supabase()).auth.getUser();
  return (
    <section className="recovery-layout">
      {user && !error ? (
        <NewPasswordForm />
      ) : (
        <div className="panel recovery-panel">
          <div className="eyebrow">Let’s try that again</div>
          <h1>You need a reset link.</h1>
          <p>
            Your link may have expired or already been used. Request a fresh
            link and open it in the same browser.
          </p>
          <Link href="/forgot-password" className="button full">
            Get a new reset link
          </Link>
          <Link href="/login" className="recovery-back">
            ← Back to log in
          </Link>
        </div>
      )}
    </section>
  );
}
