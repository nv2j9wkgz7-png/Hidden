'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LockKeyhole } from 'lucide-react';
import { api } from '@/lib/client-api';

export function PublicPreviewSettings({
  dropId,
  assets,
  selectedIds,
  published,
}: {
  dropId: string;
  assets: {
    id: string;
    name: string;
    url: string;
    thumbnailUrl?: string;
    mime: string;
  }[];
  selectedIds: string[];
  published: boolean;
}) {
  const [selected, setSelected] = useState(selectedIds);
  const [saved, setSaved] = useState(selectedIds);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const changed =
    selected.length !== saved.length ||
    selected.some((id) => !saved.includes(id));
  function choose(id: string) {
    setSelected((previous) =>
      !id
        ? []
        : previous.includes(id)
          ? previous.filter((item) => item !== id)
          : [...previous, id],
    );
    setConfirmed(false);
    setMessage('');
    setError('');
  }
  return (
    <section className="panel public-preview-settings">
      <h2>
        <Eye size={22} /> Free previews <small>Optional</small>
      </h2>
      <p className="hint">
        Choose files from this package to show clearly before purchase.
        Everything else stays blurred and locked.
      </p>
      <fieldset disabled={busy}>
        <legend className="sr-only">Files visible before purchase</legend>
        <div className="public-preview-options">
          <label className={!selected.length ? 'selected' : ''}>
            <input
              type="checkbox"
              checked={!selected.length}
              onChange={() => choose('')}
            />
            <span className="public-preview-none">
              <LockKeyhole />
            </span>
            <span>Keep all files locked</span>
          </label>
          {assets.map((asset) => (
            <label
              key={asset.id}
              className={selected.includes(asset.id) ? 'selected' : ''}
            >
              <input
                type="checkbox"
                checked={selected.includes(asset.id)}
                onChange={() => choose(asset.id)}
              />
              {asset.mime.startsWith('video/') && !asset.thumbnailUrl ? (
                <video
                  src={`${asset.url}#t=0.001`}
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                />
              ) : (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              )}
              <span>{asset.name}</span>
            </label>
          ))}
        </div>
        {!!selected.length && changed && (
          <label className="public-preview-consent">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              I understand anyone with the drop link can view and download these{' '}
              {selected.length} complete{' '}
              {selected.length === 1 ? 'file' : 'files'} without paying. They
              remain included in the package.
            </span>
          </label>
        )}
        {selected.length === assets.length && (
          <p className="notice">
            All files are selected. The entire package will be free to view.
          </p>
        )}
        <button
          type="button"
          className="secondary"
          disabled={!changed || (!!selected.length && !confirmed)}
          onClick={async () => {
            setBusy(true);
            setError('');
            setMessage('');
            try {
              await api('/api/creator/public-preview', {
                drop_id: dropId,
                asset_ids: selected,
                confirmed,
              });
              setSaved(selected);
              setConfirmed(false);
              setMessage(
                selected.length
                  ? published
                    ? 'Free previews saved. Anyone with the drop link can now open these files.'
                    : 'Free previews saved. They become public when this drop is published.'
                  : 'All files are locked before purchase. Existing download links expire within one minute; saved copies cannot be recalled.',
              );
              router.refresh();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : 'Could not save previews.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Saving…' : 'Save preview choices'}
        </button>
      </fieldset>
      {!!saved.length && (
        <p className="hint">
          <Eye size={14} /> {saved.length}{' '}
          {saved.length === 1 ? 'file is' : 'files are'} marked visible before
          purchase.
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
