import { configured } from '@/lib/env';
import { LoginForm } from '@/components/login-form';
import { Setup } from '@/components/setup';
import { ExampleDrops } from '@/components/example-drops';
import { loginDestination } from '@/lib/login-destination';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; next?: string }>;
}) {
  if (!configured()) return <Setup />;
  const params = await searchParams;
  const buyerLogin = loginDestination(params.next).startsWith('/purchases');
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow">
          {buyerLogin
            ? 'Your collection. Your corner.'
            : 'Your work. Your world.'}
        </div>
        <h2>
          {buyerLogin ? 'All your favourites.' : 'Make something.'}
          <br />
          <em>{buyerLogin ? 'All together.' : 'Make it yours.'}</em>
        </h2>
        <ExampleDrops />
        <p>
          {buyerLogin
            ? 'Your purchased photos and videos, saved in one private place.'
            : 'Add your photos and videos. Set your price. Share your link.'}
        </p>
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
          key={`${params.mode}-${loginDestination(params.next)}`}
          initialSignup={params.mode === 'signup'}
          destination={loginDestination(params.next)}
        />
      </div>
    </section>
  );
}
