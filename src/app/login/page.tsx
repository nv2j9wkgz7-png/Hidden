import { configured } from '@/lib/env';
import { LoginForm } from '@/components/login-form';
import { Setup } from '@/components/setup';
import { BrandArt } from '@/components/brand-art';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!configured()) return <Setup />;
  const params = await searchParams;
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow">Your work. Your world.</div>
        <h2>
          Keep a little
          <br />
          <em>for the reveal.</em>
        </h2>
        <BrandArt compact />
        <p>Make a drop. Share a link. Let them discover.</p>
      </div>
      <div className="auth-form-wrap">
        {params.error && (
          <div role="alert" className="notice error">
            The confirmation link expired or could not be verified. Please log
            in or request a new signup confirmation.
          </div>
        )}
        <LoginForm />
      </div>
    </section>
  );
}
