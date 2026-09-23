'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/client-api';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await logout();
      // A full navigation also discards any cached authenticated page state.
      window.location.replace('/login');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to log out. Please try again.',
      );
      setBusy(false);
    }
  }

  return (
    <form action="/auth/logout" method="post" onSubmit={submit}>
      <button type="submit" disabled={busy}>
        <LogOut size={16} /> {busy ? 'Logging out…' : 'Log out'}
      </button>
      {error && (
        <p role="alert" className="hint">
          {error}
        </p>
      )}
    </form>
  );
}
