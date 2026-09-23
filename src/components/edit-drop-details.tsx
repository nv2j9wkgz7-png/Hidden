'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';

export function EditDropDetails({
  drop,
}: {
  drop: { id: string; title: string; description: string; price_cents: number };
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <section className="panel review-details">
      <div className="review-details-heading">
        <h2>Drop details</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setEditing(!editing);
            setError('');
          }}
          disabled={busy}
        >
          {editing ? 'Cancel' : 'Edit details'}
        </button>
      </div>
      {editing ? (
        <form
          id="drop-details-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const action = (
              (event.nativeEvent as SubmitEvent)
                .submitter as HTMLButtonElement | null
            )?.value;
            const form = new FormData(event.currentTarget);
            setBusy(true);
            setError('');
            try {
              await api(
                '/api/creator/details',
                {
                  id: drop.id,
                  title: form.get('title'),
                  description: form.get('description'),
                  price_cents: Math.round(Number(form.get('price')) * 100),
                },
                'PATCH',
              );
              if (action === 'publish')
                await api('/api/creator/publish', { drop_id: drop.id });
              setEditing(false);
              if (action === 'save-draft') router.push('/dashboard');
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Could not save details.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              name="title"
              defaultValue={drop.title}
              required
              maxLength={100}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-description">Description (optional)</label>
            <textarea
              id="edit-description"
              name="description"
              defaultValue={drop.description}
              rows={3}
              maxLength={2000}
              disabled={busy}
            />
          </div>
          <div className="field">
            <label htmlFor="edit-price">Price in USD</label>
            <input
              id="edit-price"
              name="price"
              type="number"
              min="0.50"
              max="1000"
              step="0.01"
              defaultValue={(drop.price_cents / 100).toFixed(2)}
              required
              disabled={busy}
            />
            <small>Price can be changed until the first checkout starts.</small>
          </div>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      ) : (
        <p className="drop-description">
          {drop.description ||
            'Add an optional description so buyers know what’s included.'}
        </p>
      )}
    </section>
  );
}
