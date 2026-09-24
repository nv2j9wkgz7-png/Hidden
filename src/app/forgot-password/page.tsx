import { configured } from '@/lib/env';
import { Setup } from '@/components/setup';
import { ForgotPasswordForm } from '@/components/password-recovery';

export const metadata = { title: 'Forgot password' };
export default function ForgotPassword() {
  if (!configured()) return <Setup />;
  return (
    <section className="recovery-layout">
      <ForgotPasswordForm />
    </section>
  );
}
