import { configured } from '@/lib/env';
import { LoginForm } from '@/components/login-form';
import { Setup } from '@/components/setup';
import { ExampleDrops } from '@/components/example-drops';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  if (!configured()) return <Setup />;
  const params = await searchParams;
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow">Your work. Your world.</div>
        <h2>
          Make something.
          <br />
          <em>Make it yours.</em>
        </h2>
        <ExampleDrops />
        <p>Add your photos and videos. Set your price. Share your link.</p>
      </div>
      <div className="auth-form-wrap">
        {params.error && (
          <div role="alert" className="notice error">
            This sign-in or reset link expired, was already used, or was opened
            in a different browser. Log in below or use Forgot password to get a
            fresh reset link.
          </div>
        )}
        <LoginForm
          key={`${params.mode === 'signup' ? 'signup' : 'login'}-${params.next === 'new' ? 'new' : 'dashboard'}`}
          initialSignup={params.mode === 'signup'}
          destination={params.next === 'new' ? '/new' : '/dashboard'}
        />
      </div>
    </section>
  );
}
