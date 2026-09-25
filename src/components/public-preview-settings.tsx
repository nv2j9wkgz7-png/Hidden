'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediaTypeBadge } from './media-type-badge';
import { api } from '@/lib/client-api';

export function PublicPreviewSettings({
  dropId,
  assets,
  selectedIds,
  onSaved,
  onBusyChange,
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
  onSaved: (ids: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [selected, setSelected] = useState(selectedIds);
  const [saved, setSaved] = useState(selectedIds);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
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
    setError('');
  }
  return (
    <section className="panel public-preview-settings">
      <p className="hint preview-explanation">
        Selected files can be viewed and downloaded before payment.
      </p>
      <fieldset disabled={busy}>
        <legend className="sr-only">Files visible before purchase</legend>
        <div className="preview-selection-status">
          <span role="status">
            {selected.length} selected{changed ? ' · Unsaved' : ''}
          </span>
          <button
            type="button"
            className="text-button"
            disabled={!selected.length}
            onClick={() => choose('')}
          >
            Clear
          </button>
        </div>
        {!selected.length && (
          <p className="hint preview-empty">All files stay locked.</p>
        )}
        <div className="public-preview-options">
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
              <MediaTypeBadge mime={asset.mime} />
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
              <span title={asset.name}>{asset.name}</span>
            </label>
          ))}
        </div>
        <div className="preview-save-actions">
          {!!selected.length && changed && (
            <label className="public-preview-consent">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I understand anyone with the drop link can view and download
                these {selected.length} complete{' '}
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
              onBusyChange(true);
              setError('');
              try {
                await api('/api/creator/public-preview', {
                  drop_id: dropId,
                  asset_ids: selected,
                  confirmed,
                });
                setSaved(selected);
                setConfirmed(false);
                onSaved([...selected]);
                router.refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Could not save previews.',
                );
              } finally {
                setBusy(false);
                onBusyChange(false);
              }
            }}
          >
            {busy ? 'Saving…' : 'Save previews'}
          </button>
        </div>
      </fieldset>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
