'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
import { newPasswordInput } from '@/lib/password-recovery';

function authClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || cooldown) return;
    const email = String(
      new FormData(event.currentTarget).get('email') || '',
    ).trim();
    setBusy(true);
    setError('');
    try {
      const { error } = await authClient().auth.resetPasswordForEmail(email, {
        // Reuse the already-allowlisted callback. The PKCE verifier records
        // recovery intent, so no extra redirect URL needs to be trusted.
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) {
        if (error.status === 429) {
          setCooldown(60);
          setError('Too many requests. Wait a minute before trying again.');
        } else
          setError(
            'We couldn’t send a reset link right now. Please try again shortly.',
          );
        return;
      }
      setSent(true);
      setCooldown(60);
    } catch {
      setError('We couldn’t connect. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel recovery-panel">
      <div className="recovery-icon">
        <Mail size={26} />
      </div>
      <div className="eyebrow">Let’s get you back in</div>
      <h1>Forgot your password?</h1>
      <p>Enter your account email and we’ll send you a reset link.</p>
      {sent && (
        <div role="status" className="notice">
          If an account exists for that email, a reset link is on its way. Check
          your inbox and spam folder. Open the link in this browser to continue.
        </div>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="recovery-email">Email address</label>
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            required
            disabled={busy}
          />
        </div>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        <button className="primary full" disabled={busy || cooldown > 0}>
          {busy
            ? 'Sending…'
            : cooldown
              ? `Send again in ${cooldown}s`
              : sent
                ? 'Send another link'
                : 'Send reset link'}
        </button>
      </form>
      <Link className="recovery-back" href="/login">
        ← Back to log in
      </Link>
    </div>
  );
}

export function NewPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = newPasswordInput.safeParse({
      password: data.get('password'),
      confirmation: data.get('confirmation'),
    });
    setError('');
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient().auth.updateUser({
        password: result.data.password,
      });
      if (error) {
        setError(
          error.status === 401 || error.status === 403
            ? 'Your reset session expired. Request a new link below.'
            : error.code === 'same_password'
              ? 'Choose a password you haven’t used for this account.'
              : error.code === 'weak_password'
                ? 'Choose a stronger password with a mix of letters, numbers, and symbols.'
                : 'We couldn’t update your password. Try again or request a new reset link.',
        );
        return;
      }
      form.reset();
      setDone(true);
    } catch {
      setError('We couldn’t connect. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="panel recovery-panel">
        <div className="recovery-icon">
          <CheckCircle2 size={28} />
        </div>
        <h1>Password updated.</h1>
        <p role="status">
          Your new password is saved. You’re ready to return to your drops.
        </p>
        <Link href="/dashboard" className="button full">
          Go to My drops ↗
        </Link>
      </div>
    );

  return (
    <div className="panel recovery-panel">
      <div className="eyebrow">A fresh start</div>
      <h1>Set a new password.</h1>
      <p>Use at least 8 characters. A longer, unique password is best.</p>
      <form onSubmit={submit}>
        {(['password', 'confirmation'] as const).map((name) => (
          <div className="field" key={name}>
            <label htmlFor={`reset-${name}`}>
              {name === 'password' ? 'New password' : 'Confirm new password'}
            </label>
            <div className="password-control">
              <input
                id={`reset-${name}`}
                name={name}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                disabled={busy}
                aria-describedby={error ? 'reset-error' : undefined}
              />
              {name === 'password' && (
                <button
                  type="button"
                  aria-label={
                    showPassword ? 'Hide passwords' : 'Show passwords'
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              )}
            </div>
          </div>
        ))}
        {error && (
          <div id="reset-error" role="alert" className="notice error">
            {error}
          </div>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
      <Link className="recovery-back" href="/forgot-password">
        Request a new reset link
      </Link>
    </div>
  );
}
