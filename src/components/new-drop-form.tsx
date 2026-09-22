'use client';
import { useState } from 'react';
import { UploadCloud, ImageIcon, X, ShieldCheck, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { MAX_BYTES, MAX_IMAGES } from '@/lib/validation';
export type Draft = {
  id: string;
  title: string;
  price_cents: number;
  assets: {
    id: string;
    original_filename: string;
    size_bytes: number;
    mime_type: string;
    status: string;
  }[];
};
type Item = {
  file?: File;
  name: string;
  size: number;
  mime: string;
  id?: string;
  ready: boolean;
};
export function NewDropForm({ draft }: { draft?: Draft }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft?.title || ''),
    [price, setPrice] = useState(
      draft ? (draft.price_cents / 100).toFixed(2) : '',
    ),
    [dropId, setDropId] = useState(draft?.id);
  const [items, setItems] = useState<Item[]>(
    draft?.assets.map((a) => ({
      id: a.id,
      name: a.original_filename,
      size: a.size_bytes,
      mime: a.mime_type,
      ready: a.status === 'READY',
    })) || [],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [progress, setProgress] = useState('');
  async function remove(index: number) {
    const item = items[index];
    setError('');
    setBusy(true);
    try {
      if (item.id)
        await api('/api/creator/remove', {
          drop_id: dropId,
          asset_id: item.id,
        });
      setItems(items.filter((_, i) => i !== index));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to remove image.',
      );
    } finally {
      setBusy(false);
    }
  }
  function select(files: FileList | null) {
    if (!files) return;
    setError('');
    const next = [...items];
    for (const file of Array.from(files)) {
      if (
        file.size > MAX_BYTES ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ) {
        setError('Choose JPEG, PNG, or WebP images up to 10 MB each.');
        continue;
      }
      const pending = next.findIndex(
        (i) =>
          !i.ready && !i.file && i.name === file.name && i.size === file.size,
      );
      if (pending >= 0) next[pending] = { ...next[pending], file };
      else if (next.length < MAX_IMAGES)
        next.push({
          file,
          name: file.name,
          size: file.size,
          mime: file.type,
          ready: false,
        });
      else setError('A drop can contain up to 20 images.');
    }
    setItems(next);
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!items.length) {
      setError('Choose at least one image.');
      return;
    }
    if (items.some((i) => !i.ready && !i.file)) {
      setError(
        'Reselect the unfinished files listed below to resume your draft.',
      );
      return;
    }
    if (
      !/^\d+(\.\d{1,2})?$/.test(price) ||
      Number(price) < 0.5 ||
      Number(price) > 1000
    ) {
      setError(
        'Set a price between $0.50 and $1,000, with at most two decimals.',
      );
      return;
    }
    setBusy(true);
    const working = items.map((i) => ({ ...i }));
    try {
      let id = dropId;
      if (!id) {
        setProgress('Saving your drop…');
        const created = await api('/api/creator/drops', {
          title,
          price_cents: Math.round(Number(price) * 100),
        });
        id = created.id;
        setDropId(id);
        window.history.replaceState(null, '', `/new?drop=${id}`);
      }
      if (dropId)
        await api(
          '/api/creator/drops',
          { id, title, price_cents: Math.round(Number(price) * 100) },
          'PATCH',
        );
      for (let index = 0; index < working.length; index++) {
        const item = working[index];
        if (item.ready) continue;
        setProgress(`Uploading image ${index + 1} of ${working.length}…`);
        // A previous request may have uploaded successfully but lost its response.
        if (item.id) {
          try {
            await api('/api/creator/finalize', {
              drop_id: id,
              asset_id: item.id,
            });
            item.ready = true;
            setItems([...working]);
            continue;
          } catch {
            /* Retry the immutable original upload, then finalize again. */
          }
        }
        const reservation = await api('/api/creator/uploads', {
          drop_id: id,
          asset_id: item.id,
          original_filename: item.name,
          mime_type: item.mime,
          size_bytes: item.size,
        });
        item.id = reservation.asset_id;
        setItems([...working]);
        const uploaded = await fetch(reservation.upload_url, {
          method: 'PUT',
          headers: { 'Content-Type': item.mime, 'x-upsert': 'false' },
          body: item.file,
        });
        if (!uploaded.ok) {
          const response = await uploaded.json().catch(() => ({}));
          if (
            !['409', '400'].includes(String(response.statusCode)) ||
            !/exist|duplicate/i.test(response.message || response.error || '')
          )
            throw new Error(
              'Upload failed. Please retry to continue this draft.',
            );
        }
        setProgress(`Creating safe preview ${index + 1} of ${working.length}…`);
        await api('/api/creator/finalize', { drop_id: id, asset_id: item.id });
        item.ready = true;
        setItems([...working]);
      }
      setProgress('Creating your shareable link…');
      const published = await api('/api/creator/publish', { drop_id: id });
      router.push(published.url);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to publish. Please retry.',
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  return (
    <form onSubmit={publish} className="editor">
      <section className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Your images</h2>
          <span className="hint">{items.length} / 20</span>
        </div>
        <label
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!busy) select(e.dataTransfer.files);
          }}
        >
          <UploadCloud size={30} />
          <strong>Drop your images here</strong>
          <p>or click to choose files</p>
          <p>JPEG, PNG, WebP · up to 10 MB each</p>
          <input
            aria-label="Choose images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={(e) => {
              select(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        {items.map((item, i) => (
          <div className="file-row" key={item.id || `${item.name}-${i}`}>
            <ImageIcon size={20} color="#8b7bc2" />
            <span>
              {item.name}
              <br />
              <small>
                {(item.size / 1024 / 1024).toFixed(1)} MB
                {item.ready
                  ? ' · Preview ready'
                  : !item.file
                    ? ' · Reselect this file to resume'
                    : ''}
              </small>
            </span>
            {item.ready && <Check size={17} color="#267251" />}
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              disabled={busy}
              onClick={() => remove(i)}
            >
              <X size={18} />
            </button>
          </div>
        ))}
        <div className="tip">
          <ShieldCheck size={18} />
          <span>
            Originals are private. Buyers see reduced, watermarked previews
            until payment is confirmed.
          </span>
        </div>
      </section>
      <aside className="panel">
        <h2>Drop details</h2>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            placeholder="e.g. The coastal collection"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor="price">Price in USD</label>
          <div className="price-input">
            <span>$</span>
            <input
              id="price"
              inputMode="decimal"
              placeholder="15.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <small>One payment unlocks the entire drop.</small>
        </div>
        <hr className="divider" />
        <p className="hint">
          Once published, your collection and price are fixed. You can share the
          same link with multiple buyers.
        </p>
        {error && (
          <div role="alert" className="notice error">
            {error}
          </div>
        )}
        {progress && (
          <div role="status" className="notice">
            {progress}
            <progress
              value={items.filter((i) => i.ready).length}
              max={items.length}
            />
          </div>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Preparing your drop…' : 'Publish drop'} {!busy && '↗'}
        </button>
        <p className="payment-note">
          Your link is ready as soon as you publish.
        </p>
      </aside>
    </form>
  );
}
