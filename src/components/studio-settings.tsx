'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Eye, Pencil, X } from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
import { EditDropDetails } from './edit-drop-details';
import { PublicPreviewSettings } from './public-preview-settings';

type Props = {
  drop: { id: string; title: string; description: string; price_cents: number };
  draft: boolean;
  allowPreviews: boolean;
  assets: {
    id: string;
    name: string;
    url: string;
    thumbnailUrl?: string;
    mime: string;
  }[];
  selectedIds: string[];
};

export function StudioSettings({
  drop,
  draft,
  allowPreviews,
  assets,
  selectedIds,
}: Props) {
  const [active, setActive] = useState<'details' | 'previews' | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedIds, setSavedIds] = useState(selectedIds);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => setSavedIds(selectedIds), [selectedIds]);
  useEffect(() => {
    if (active) dialog.current?.showModal();
  }, [active]);
  function close() {
    dialog.current?.close();
    setActive(null);
  }
  function open(section: 'details' | 'previews') {
    setMessage('');
    setActive(section);
  }
  return (
    <>
      <div className="studio-settings-actions">
        {draft ? (
          <Link href={`/new?drop=${drop.id}`}>
            <Pencil size={18} aria-hidden="true" />
            Edit details
          </Link>
        ) : (
          <button type="button" onClick={() => open('details')}>
            <Pencil size={18} aria-hidden="true" />
            Edit details
          </button>
        )}
        {allowPreviews && (
          <button
            type="button"
            className="preview-settings-button"
            onClick={() => open('previews')}
          >
            <Eye size={18} aria-hidden="true" />
            Free previews <span>{savedIds.length}</span>
          </button>
        )}
      </div>
      {message && (
        <p className="studio-settings-saved" role="status">
          {message}
        </p>
      )}
      <dialog
        className="studio-settings-dialog"
        ref={dialog}
        aria-labelledby={headingId}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setActive(null)}
      >
        <header className="studio-settings-heading">
          <h2 id={headingId}>
            {active === 'details' ? 'Edit details' : 'Free previews'}
          </h2>
          <button
            type="button"
            aria-label="Close settings"
            onClick={close}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </header>
        <div className="studio-settings-body">
          {active === 'details' && (
            <EditDropDetails
              drop={drop}
              onBusyChange={setBusy}
              onSaved={() => {
                setMessage('Details saved');
                close();
              }}
            />
          )}
          {active === 'previews' && (
            <PublicPreviewSettings
              dropId={drop.id}
              assets={assets}
              selectedIds={savedIds}
              onBusyChange={setBusy}
              onSaved={(ids) => {
                setSavedIds(ids);
                setMessage(
                  ids.length
                    ? 'Free previews saved'
                    : 'All files are locked before purchase. Existing download links expire within one minute; saved copies cannot be recalled.',
                );
                close();
              }}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
