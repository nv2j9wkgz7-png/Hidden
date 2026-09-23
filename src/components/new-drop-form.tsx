'use client';
import { SortableFiles } from './sortable-files';
import { uploadMime, droppedFiles } from '@/lib/upload-files';
import { CreatorGallery } from './creator-gallery';
import { EarningsEstimate } from './earnings-estimate';
import { useEffect, useRef, useState } from 'react';
import { UploadCloud, ImageIcon, X, ShieldCheck, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { MAX_IMAGES, MAX_DROP_BYTES, mediaLimit } from '@/lib/validation';
export type Draft = {
  id: string;
  title: string;
  description?: string;
  price_cents: number;
  assets: {
    id: string;
    original_filename: string;
    size_bytes: number;
    mime_type: string;
    status: string;
    preview_url?: string;
  }[];
};
type Item = {
  key: string;
  file?: File;
  name: string;
  size: number;
  mime: string;
  id?: string;
  ready: boolean;
  preview?: string;
};
export function NewDropForm({ draft }: { draft?: Draft }) {
  const router = useRouter();
  const objectUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  function localPreview(file: File) {
    const url = URL.createObjectURL(file);
    objectUrls.current.add(url);
    return url;
  }
  const imagesRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [invalidField, setInvalidField] = useState('');
  const [description, setDescription] = useState(draft?.description || '');
  const [title, setTitle] = useState(draft?.title || ''),
    [price, setPrice] = useState(
      draft ? (draft.price_cents / 100).toFixed(2) : '',
    ),
    [dropId, setDropId] = useState(draft?.id);
  const [items, setItems] = useState<Item[]>(
    draft?.assets.map((a) => ({
      key: a.id,
      id: a.id,
      name: a.original_filename,
      size: a.size_bytes,
      mime: a.mime_type,
      ready: a.status === 'READY',
      preview: a.preview_url,
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
      if (item.preview && objectUrls.current.delete(item.preview))
        URL.revokeObjectURL(item.preview);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to remove image.',
      );
    } finally {
      setBusy(false);
    }
  }
  function select(files: FileList | File[] | null) {
    if (!files) return;
    setError('');
    const next = [...items];
    let skipped = 0;
    for (const file of Array.from(files)) {
      const mime = uploadMime(file);
      if (!mime || file.size < 1 || file.size > mediaLimit(mime)) {
        skipped++;
        continue;
      }
      const pending = next.findIndex(
        (i) =>
          !i.ready && !i.file && i.name === file.name && i.size === file.size,
      );
      if (pending >= 0)
        next[pending] = { ...next[pending], file, preview: localPreview(file) };
      else if (
        next.length < MAX_IMAGES &&
        next.reduce((n, item) => n + item.size, 0) + file.size <= MAX_DROP_BYTES
      )
        next.push({
          key: crypto.randomUUID(),
          file,
          preview: localPreview(file),
          name: file.name,
          size: file.size,
          mime,
          ready: false,
        });
      else skipped++;
    }
    setItems(next);
    if (skipped)
      setError(
        `${skipped} file(s) skipped. Use JPEG, PNG, WebP (10 MB) or MP4, MOV, WebM (50 MB). Maximum 20 files and 200 MB per drop.`,
      );
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setInvalidField('');
    if (!items.length) {
      setError('Add at least one photo or video first.');
      setInvalidField('images');
      imagesRef.current?.focus();
      return;
    }
    if (items.some((i) => !i.ready && !i.file)) {
      setError(
        'Reselect the unfinished files listed below to resume your draft.',
      );
      setInvalidField('images');
      imagesRef.current?.focus();
      return;
    }
    if (!title.trim() || title.trim().length > 100) {
      setError('Add a title for your drop (up to 100 characters).');
      setInvalidField('title');
      titleRef.current?.focus();
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
      setInvalidField('price');
      priceRef.current?.focus();
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
          description,
          price_cents: Math.round(Number(price) * 100),
        });
        id = created.id;
        setDropId(id);
        window.history.replaceState(null, '', `/new?drop=${id}`);
      }
      if (dropId)
        await api(
          '/api/creator/drops',
          {
            id,
            title,
            description,
            price_cents: Math.round(Number(price) * 100),
          },
          'PATCH',
        );
      for (let index = 0; index < working.length; index++) {
        const item = working[index];
        if (item.ready) continue;
        setProgress(`Uploading file ${index + 1} of ${working.length}…`);
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
      setProgress('Saving file order…');
      await api('/api/creator/reorder', {
        drop_id: id,
        asset_ids: working.map((item) => item.id),
      });
      setProgress('Preparing your review…');
      const review = await api('/api/creator/review', { drop_id: id });
      router.push(review.review_url);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to save. Please retry.',
      );
    } finally {
      setBusy(false);
      setProgress('');
    }
  }
  const previewImages = items.flatMap((item) =>
    item.preview
      ? [
          {
            id: item.id || item.preview,
            name: item.name,
            size: item.size,
            url: item.preview,
            mime: item.mime,
          },
        ]
      : [],
  );
  return (
    <form noValidate onSubmit={publish} className="editor">
      <section className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Your photos & videos</h2>
          <span className="hint">{items.length} / 20</span>
        </div>
        <label
          className="upload-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              select(await droppedFiles(e.dataTransfer));
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : 'Could not read this folder.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <UploadCloud size={30} />
          <strong>Drop photos, videos, or a folder here</strong>
          <p>or click to choose files</p>
          <p>Photos up to 10 MB · Videos up to 50 MB</p>
          <input
            ref={imagesRef}
            aria-invalid={invalidField === 'images'}
            aria-describedby={
              invalidField === 'images' ? 'drop-error' : undefined
            }
            aria-label="Choose photos and videos"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov"
            multiple
            disabled={busy}
            onChange={(e) => {
              select(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <label className="folder-upload button secondary">
          Choose folder
          <input
            type="file"
            multiple
            disabled={busy}
            aria-label="Choose folder"
            ref={(element) => {
              element?.setAttribute('webkitdirectory', '');
            }}
            onChange={(event) => {
              select(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <p className="hint">
          JPEG, PNG, WebP · MP4, MOV, WebM. Up to 20 files / 200 MB. Folder
          contents are added to one drop, including subfolders.
        </p>
        {items.length > 0 && (
          <p className="hint">
            Tap a thumbnail to view the photo or play the video.
          </p>
        )}
        <CreatorGallery
          images={previewImages}
          renderItems={(openImage) => (
            <SortableFiles
              items={items}
              identify={(item) => item.key}
              label={(item) => item.name}
              disabled={busy}
              onChange={setItems}
              render={(item, i) => (
                <>
                  {item.preview ? (
                    <button
                      type="button"
                      className="upload-thumbnail"
                      aria-label={`View ${item.name}`}
                      onClick={() =>
                        openImage(
                          previewImages.findIndex(
                            (image) => image.url === item.preview,
                          ),
                        )
                      }
                    >
                      {item.mime.startsWith('video/') ? (
                        <>
                          <video
                            src={item.preview}
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <span className="video-badge">▶</span>
                        </>
                      ) : (
                        <img
                          src={item.preview}
                          alt=""
                          referrerPolicy="no-referrer"
                          draggable={false}
                        />
                      )}
                    </button>
                  ) : (
                    <ImageIcon size={20} color="#8b7bc2" />
                  )}
                  <span>
                    {i === 0 && <small className="cover-label">Cover · </small>}
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
                </>
              )}
            />
          )}
        />
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
            ref={titleRef}
            aria-invalid={invalidField === 'title'}
            aria-describedby={
              invalidField === 'title' ? 'drop-error' : undefined
            }
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
          <label htmlFor="description">
            Description <span className="muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Tell buyers what’s included in this drop…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={busy}
            aria-describedby="description-help"
          />
          <small id="description-help">
            {description.length} / 2,000 characters
          </small>
        </div>
        <div className="field">
          <label htmlFor="price">Price in USD</label>
          <div className="price-input">
            <span>$</span>
            <input
              ref={priceRef}
              aria-invalid={invalidField === 'price'}
              aria-describedby={
                invalidField === 'price' ? 'drop-error' : undefined
              }
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
          <EarningsEstimate cents={Math.round(Number(price) * 100)} />
        </div>
        <hr className="divider" />
        <p className="hint">
          Review your drop and make final edits next. You can share the same
          link with multiple buyers.
        </p>
        {error && (
          <div id="drop-error" role="alert" className="notice error">
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
          {busy ? 'Preparing your drop…' : 'Review drop'} {!busy && '↗'}
        </button>
      </aside>
    </form>
  );
}
