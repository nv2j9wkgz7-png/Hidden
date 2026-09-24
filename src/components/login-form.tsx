'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
export function LoginForm({
  initialSignup = false,
  destination = '/dashboard',
}: {
  initialSignup?: boolean;
  destination?: string;
}) {
  const [signup, setSignup] = useState(initialSignup),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      );
      const credentials = {
        email: String(form.get('email')),
        password: String(form.get('password')),
      };
      const { data, error } = signup
        ? await client.auth.signUp({
            ...credentials,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
            },
          })
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) {
        router.push(destination);
        router.refresh();
      } else
        setMessage(
          'Check your email and open the confirmation link to continue.',
        );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel">
      <div className="eyebrow">
        {destination.startsWith('/purchases')
          ? 'Your private library'
          : 'Your creator workspace'}
      </div>
      <h1>{signup ? 'Make it yours.' : 'Welcome back.'}</h1>
      <p>
        {destination.startsWith('/purchases')
          ? 'Save your purchases in one private library. Come back on any device while the files remain available.'
          : signup
            ? 'Create an account to publish your first drop.'
            : 'Log in to manage your drops.'}
      </p>
      <form
        key={signup ? 'signup' : 'login'}
        id={signup ? 'signup-form' : 'login-form'}
        method="post"
        autoComplete="on"
        onSubmit={submit}
      >
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor={signup ? 'new-password' : 'current-password'}>
            Password
          </label>
          <div className="password-control">
            <input
              id={signup ? 'new-password' : 'current-password'}
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={8}
              maxLength={128}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          {signup && <small>Use at least 8 characters.</small>}
          {!signup && (
            <Link className="forgot-password-link" href="/forgot-password">
              Forgot password?
            </Link>
          )}
        </div>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        {message && (
          <div role="status" className="notice">
            {message}
          </div>
        )}
        <button type="submit" className="primary full" disabled={busy}>
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
        </button>
      </form>
      {destination.startsWith('/purchases') && (
        <p>
          <Link href="/purchases/recover">Recover a guest purchase</Link>
        </p>
      )}
      <hr className="divider" />
      <button
        className="text-button"
        onClick={() => {
          setSignup(!signup);
          setShowPassword(false);
          setError('');
          setMessage('');
        }}
      >
        {signup
          ? 'Already have an account? Log in'
          : 'New to Hidn? Create an account'}
      </button>
    </div>
  );
}
