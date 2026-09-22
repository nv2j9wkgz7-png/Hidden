import { configured } from '@/lib/env';
import { LoginForm } from '@/components/login-form';
import { Setup } from '@/components/setup';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!configured()) return <Setup />;
  const params = await searchParams;
  return (
    <section className="narrow">
      {params.error && (
        <div role="alert" className="notice error">
          The confirmation link expired or could not be verified. Please log in
          or request a new signup confirmation.
        </div>
      )}
      <LoginForm />
    </section>
  );
}
