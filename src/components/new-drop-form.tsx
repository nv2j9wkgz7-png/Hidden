'use client';
import {
  readDraft,
  writeDraft,
  deleteDraft,
  type StoredDraft,
} from '@/lib/draft-storage';
import { uploadFiles } from '@/lib/upload-queue';
import { uploadWithProgress } from '@/lib/upload-progress';
import { SortableFiles } from './sortable-files';
import { uploadMime, droppedFiles } from '@/lib/upload-files';
import { CreatorGallery } from './creator-gallery';
import { MediaTypeBadge } from './media-type-badge';
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
    is_public_preview?: boolean;
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
  freePreview?: boolean;
  percent?: number;
  phase?: string;
  failure?: string;
};
export function NewDropForm({
  draft,
  userId,
}: {
  draft?: Draft;
  userId: string;
}) {
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
      freePreview: a.is_public_preview ?? false,
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
        (i) => !i.ready && i.name === file.name && i.size === file.size,
      );
      if (pending >= 0)
        next[pending] = {
          ...next[pending],
          file,
          failure: undefined,
          preview: localPreview(file),
        };
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
  const [hydrated, setHydrated] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [saved, setSaved] = useState('Recovering your draft…');
  const [localError, setLocalError] = useState('');
  const creationId = useRef(draft?.id || '');
  const running = useRef(false);
  const localWrites = useRef(Promise.resolve());
  const localPending = useRef(false);
  const attempted = useRef('');
  const snapshot = useRef({ title, description, price, items, dropId });
  snapshot.current = { title, description, price, items, dropId };
  const fingerprint = JSON.stringify([
    title,
    description,
    price,
    dropId,
    items.map((i) => [
      i.key,
      i.id,
      i.ready,
      !i.ready && !!i.file,
      !!i.freePreview,
    ]),
  ]);
  const cloudSaved = useRef(
    draft && items.every((i) => i.ready) ? fingerprint : '',
  );
  useEffect(() => {
    let cancelled = false;
    const key = `${userId}:${draft?.id || 'new'}`;
    void readDraft(key)
      .then(async (stored) => {
        if (cancelled) return;
        if (!stored && draft) {
          const pending = await readDraft(`${userId}:new`);
          if (pending?.id === draft.id) stored = pending;
        }
        if (cancelled) return;
        if (stored) {
          creationId.current = stored.creationId;
          setTitle(stored.title);
          setDescription(stored.description);
          setPrice(stored.price);
          setDropId(stored.id);
          const used = new Set<string>();
          const recovered: Item[] = stored.items.map((item) => {
            const server = draft?.assets.find(
              (a) =>
                !used.has(a.id) &&
                (a.id === item.id ||
                  (!item.id &&
                    a.original_filename === item.name &&
                    a.size_bytes === item.size &&
                    a.mime_type === item.mime)),
            );
            if (server) used.add(server.id);
            return {
              ...item,
              id: server?.id || item.id,
              ready: server ? server.status === 'READY' : item.ready,
              freePreview:
                item.freePreview ?? server?.is_public_preview ?? false,
              preview:
                server?.preview_url ||
                (item.file ? localPreview(item.file) : undefined),
            };
          });
          for (const server of draft?.assets || [])
            if (!used.has(server.id))
              recovered.push({
                key: server.id,
                id: server.id,
                name: server.original_filename,
                size: server.size_bytes,
                mime: server.mime_type,
                ready: server.status === 'READY',
                preview: server.preview_url,
                freePreview: server.is_public_preview ?? false,
              });
          setItems(recovered);
          if (stored.id && !draft)
            window.history.replaceState(null, '', `/new?drop=${stored.id}`);
        }
        if (!creationId.current) creationId.current = crypto.randomUUID();
      })
      .catch(() => {
        if (!cancelled)
          setLocalError(
            'This browser cannot keep a recovery copy. Keep this page open until your drop is saved online.',
          );
      })
      .finally(() => {
        if (!creationId.current) creationId.current = crypto.randomUUID();
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, draft]);
  useEffect(() => {
    if (!hydrated) return;
    const current = snapshot.current;
    const stored: StoredDraft = {
      id: current.dropId,
      creationId: creationId.current,
      title: current.title,
      description: current.description,
      price: current.price,
      items: current.items.map(
        ({ key, id, name, size, mime, ready, file, freePreview }) => ({
          key,
          id,
          name,
          size,
          mime,
          ready,
          file: ready ? undefined : file,
          freePreview,
        }),
      ),
    };
    localPending.current = true;
    localWrites.current = localWrites.current
      .catch(() => {})
      .then(async () => {
        if (fingerprint === cloudSaved.current) {
          await deleteDraft(`${userId}:${current.dropId || 'new'}`);
          await deleteDraft(`${userId}:new`, creationId.current);
        } else
          await writeDraft(
            `${userId}:${current.dropId || 'new'}`,
            stored,
            current.dropId ? `${userId}:new` : undefined,
          );
      })
      .then(() => {
        setLocalError('');
      })
      .catch(() =>
        setLocalError(
          'Couldn’t save a recovery copy on this device. Keep this page open until uploading finishes.',
        ),
      )
      .finally(() => {
        localPending.current = false;
      });
  }, [fingerprint, hydrated, userId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (running.current || localPending.current || localError) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [localError]);
  function validDetails(value = snapshot.current) {
    return (
      !!value.title.trim() &&
      value.title.trim().length <= 100 &&
      /^\d+(\.\d{1,2})?$/.test(value.price) &&
      Number(value.price) >= 0.5 &&
      Number(value.price) <= 1000
    );
  }
  useEffect(() => {
    if (
      !hydrated ||
      busy ||
      running.current ||
      attempted.current === fingerprint
    )
      return;
    if (!validDetails()) {
      setSaved('Saved on this device · Add a title and price to sync online');
      return;
    }
    setSaved('Unsaved changes…');
    const timer = setTimeout(() => {
      attempted.current = fingerprint;
      void syncDraft();
    }, 1200);
    return () => clearTimeout(timer);
  }, [fingerprint, hydrated, busy]);

  async function syncDraft(review = false, retryKey?: string) {
    if (running.current) return;
    const current = snapshot.current;
    if (!validDetails(current)) {
      if (review || retryKey) {
        setError(
          'Add a title and a price between $0.50 and $1,000 to continue.',
        );
        if (!current.title.trim()) {
          setInvalidField('title');
          titleRef.current?.focus();
        } else {
          setInvalidField('price');
          priceRef.current?.focus();
        }
      }
      return;
    }
    if (review && !current.items.length) {
      setError('Add at least one photo or video first.');
      setInvalidField('images');
      imagesRef.current?.focus();
      return;
    }
    setInvalidField('');
    running.current = true;
    setReviewing(review);
    setBusy(true);
    setError('');
    setSaved('Saving…');
    const working = current.items.map((item) => ({ ...item }));
    const update = (item: Item) =>
      setItems((previous) =>
        previous.map((old) => (old.key === item.key ? { ...item } : old)),
      );
    try {
      let id = current.dropId;
      if (!id) {
        // Persist the creation ID before the request so a lost response cannot duplicate a draft.
        await localWrites.current;
        const created = await api('/api/creator/drops', {
          id: creationId.current,
          title: current.title,
          description: current.description,
          price_cents: Math.round(Number(current.price) * 100),
        });
        id = created.id as string;
        setDropId(id);
        window.history.replaceState(null, '', `/new?drop=${id}`);
      }
      await api(
        '/api/creator/drops',
        {
          id,
          title: current.title,
          description: current.description,
          price_cents: Math.round(Number(current.price) * 100),
        },
        'PATCH',
      );
      await uploadFiles(
        working,
        id!,
        update,
        { review, retryKey },
        { request: api, upload: uploadWithProgress },
      );
      if (working.every((item) => item.id))
        await api('/api/creator/reorder', {
          drop_id: id,
          asset_ids: working.map((item) => item.id),
        });
      const unfinished = working.some((item) => !item.ready);
      if (!unfinished)
        await api('/api/creator/public-preview', {
          drop_id: id,
          asset_ids: working
            .filter((item) => item.freePreview)
            .map((item) => item.id),
          confirmed: true,
        });
      if (!unfinished)
        cloudSaved.current = JSON.stringify([
          current.title,
          current.description,
          current.price,
          id,
          working.map((i) => [i.key, i.id, i.ready, false, !!i.freePreview]),
        ]);
      if (
        !unfinished &&
        snapshot.current.title === current.title &&
        snapshot.current.price === current.price &&
        snapshot.current.description === current.description
      ) {
        localWrites.current = localWrites.current
          .catch(() => {})
          .then(async () => {
            await deleteDraft(`${userId}:${id}`);
            await deleteDraft(`${userId}:new`, creationId.current);
          });
        await localWrites.current.catch(() => {});
      }
      setSaved(
        unfinished ? 'Details saved · Some files need attention' : 'Saved',
      );
      if (review) {
        if (unfinished)
          throw new Error(
            'Some files need attention. Retry them below before reviewing.',
          );
        const result = await api('/api/creator/review', { drop_id: id });
        await localWrites.current;
        router.push(result.review_url);
        router.refresh();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not save. Your recovery copy remains on this device.',
      );
      setSaved('Couldn’t sync · Retry saving');
    } finally {
      running.current = false;
      setReviewing(false);
      setBusy(false);
      setProgress('');
    }
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    await syncDraft(true);
  }
  const previewImages = items.flatMap((item) =>
    item.preview
      ? [
          {
            id: item.key,
            name: item.name,
            size: item.size,
            url: item.preview.startsWith('/api/creator/media')
              ? `${item.preview}&view=original`
              : item.preview,
            mime: item.mime,
          },
        ]
      : [],
  );
  return (
    <form noValidate onSubmit={publish} className="editor drop-editor">
      <section className="panel">
        <div className="section-title" style={{ marginTop: 0 }}>
          <h2>Your files</h2>
          <span className="hint">{items.length} / 20</span>
        </div>
        <div className={`upload-options ${items.length ? 'has-files' : ''}`}>
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
            <strong>Add photos & videos</strong>
            <p>Tap to choose files, or drag them here</p>
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
              disabled={busy || !hydrated}
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
              disabled={busy || !hydrated}
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
        </div>
        <details className="upload-limits">
          <summary>File types & limits</summary>
          <p>Photos: JPEG, PNG, WebP · up to 10 MB each.</p>
          <p>Videos: MP4, MOV, WebM · up to 50 MB each.</p>
          <p>Up to 20 files and 200 MB per drop. Subfolders are included.</p>
        </details>
        <CreatorGallery
          images={previewImages}
          renderItems={(openImage) => (
            <SortableFiles
              items={items}
              identify={(item) => item.key}
              label={(item) => item.name}
              disabled={busy || !hydrated}
              onChange={setItems}
              render={(item, i) => (
                <>
                  {item.preview ? (
                    <button
                      type="button"
                      className="upload-thumbnail"
                      aria-label={`View ${item.mime.startsWith('video/') ? 'video' : 'photo'}: ${item.name}`}
                      onClick={() =>
                        openImage(
                          previewImages.findIndex(
                            (image) => image.id === item.key,
                          ),
                        )
                      }
                    >
                      <MediaTypeBadge mime={item.mime} />
                      {item.mime.startsWith('video/') &&
                      !item.preview.startsWith('/api/creator/media') ? (
                        <>
                          <video
                            src={item.preview}
                            muted
                            playsInline
                            preload="metadata"
                          />
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
                  <span className="file-details">
                    <span className="file-name" title={item.name}>
                      {item.name}
                    </span>
                    <small>
                      {i === 0 && (
                        <span className="file-cover-badge">Cover</span>
                      )}
                      {(item.size / 1024 / 1024).toFixed(1)} MB
                      {item.ready
                        ? ' · Saved'
                        : !item.file
                          ? ' · Reselect this file to resume'
                          : item.phase
                            ? ` · ${item.phase}${item.phase === 'Uploading' ? ` ${item.percent || 0}%` : ''}`
                            : ' · Waiting to upload'}
                    </small>
                    <button
                      type="button"
                      className="file-preview-toggle"
                      aria-pressed={!!item.freePreview}
                      disabled={busy || !hydrated}
                      onClick={() => {
                        if (
                          !item.freePreview &&
                          !window.confirm(
                            `Make ${item.name} a free preview? Anyone with the published drop link can view and download this entire file without paying. It stays in the package.`,
                          )
                        )
                          return;
                        setItems((previous) =>
                          previous.map((file) =>
                            file.key === item.key
                              ? { ...file, freePreview: !file.freePreview }
                              : file,
                          ),
                        );
                      }}
                    >
                      {item.freePreview
                        ? '✓ Free preview · Remove'
                        : '+ Make free preview'}
                    </button>
                    {item.phase === 'Uploading' && (
                      <progress
                        aria-label={`Uploading ${item.name}`}
                        value={item.percent || 0}
                        max={100}
                      />
                    )}
                    {item.failure && (
                      <small className="file-upload-error">
                        {item.failure}
                      </small>
                    )}
                  </span>
                  {item.failure && item.file && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => void syncDraft(false, item.key)}
                    >
                      Retry
                    </button>
                  )}
                  {item.ready && <Check size={17} color="#267251" />}
                  <button
                    type="button"
                    aria-label={`Remove ${item.name}`}
                    disabled={busy || !hydrated}
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
            Files stay locked until payment, except files you choose as free
            previews.
          </span>
        </div>
      </section>
      <aside className="panel">
        <h2>Drop details</h2>
        <p className="draft-save-status" role="status">
          {saved}
        </p>
        {localError && (
          <p className="notice error" role="alert">
            {localError}
          </p>
        )}
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
            disabled={!hydrated || reviewing}
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
            disabled={!hydrated || reviewing}
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
              disabled={!hydrated || reviewing}
            />
          </div>
          <small>One payment unlocks the entire drop.</small>
          <EarningsEstimate cents={Math.round(Number(price) * 100)} />
        </div>
        <hr className="divider" />
        <p className="hint">You can make final edits before publishing.</p>
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
        {error && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => void syncDraft()}
          >
            Retry saving
          </button>
        )}
        <button className="primary full" disabled={busy || !hydrated}>
          {busy ? 'Saving your drop…' : 'Review drop'} {!busy && '↗'}
        </button>
      </aside>
    </form>
  );
}
