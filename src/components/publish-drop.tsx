'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
export function PublishDrop({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <div>
      <button
        type="submit"
        form="drop-details-form"
        name="action"
        value="publish"
        className="primary full"
        disabled={busy}
        onClick={async (event) => {
          if (document.getElementById('drop-details-form')) return;
          event.preventDefault();
          setBusy(true);
          setError('');
          try {
            await api('/api/creator/publish', { drop_id: id });
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not publish.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Publishing…' : 'Publish & share'}
      </button>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </div>
  );
}
