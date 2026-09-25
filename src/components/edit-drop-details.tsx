'use client';
import { EarningsEstimate } from './earnings-estimate';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';

export function EditDropDetails({
  drop,
  onSaved,
  onBusyChange,
}: {
  drop: { id: string; title: string; description: string; price_cents: number };
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [price, setPrice] = useState((drop.price_cents / 100).toFixed(2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <form
      id="drop-details-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        onBusyChange(true);
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
          onSaved();
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save details.');
        } finally {
          setBusy(false);
          onBusyChange(false);
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          disabled={busy}
        />
        <small>Price can be changed until the first checkout starts.</small>
        <EarningsEstimate cents={Math.round(Number(price) * 100)} />
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
  );
}
