'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { CreatorGallery } from './creator-gallery';
const actions = {
  REVIEW: ['Start review', 'Flag this report as being reviewed.'],
  RESOLVE: [
    'Resolve report',
    'Close this report. Access and sales restrictions stay as they are.',
  ],
  DISMISS: [
    'Dismiss report',
    'Close this report without changing access or sales.',
  ],
  PAUSE: [
    'Pause sales',
    'Block new purchases and expire open checkouts. Existing buyers keep access.',
  ],
  REMOVE: [
    'Remove content',
    'Hide the drop, block original viewing and downloads, and delete public previews. Originals are retained privately for review. Existing downloads and cached copies cannot be recalled.',
  ],
  RESUME: [
    'Resume paused drop',
    'Clear the moderation pause. Creator-closed sales and creator suspension still apply. Removed content cannot be restored here.',
  ],
  SUSPEND: [
    'Suspend creator',
    'Block this creator from creating, uploading, publishing, or selling across all drops. Existing buyers keep access unless a drop is removed.',
  ],
  UNSUSPEND: [
    'Restore creator',
    'Allow creating and selling again. Individual drop restrictions still apply.',
  ],
  RETRY_CLEANUP: [
    'Retry cleanup',
    'Retry expiring unpaid checkouts and deleting previews for removed drops.',
  ],
} as const;
export function ModerationControls({
  reportId,
  state,
  suspended,
  cleanupPending,
}: {
  reportId: string;
  state: string;
  suspended: boolean;
  cleanupPending: boolean;
}) {
  const router = useRouter();
  const [action, setAction] = useState<keyof typeof actions>('REVIEW'),
    [note, setNote] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    requestId.current ||= crypto.randomUUID();
    try {
      const result = await api('/api/admin/moderate', {
        report_id: reportId,
        action,
        note,
        request_id: requestId.current,
      });
      requestId.current = null;
      setConfirmed(false);
      setMessage(
        result.cleanup_pending
          ? 'Restriction saved. Some external cleanup is still pending—retry cleanup.'
          : 'Saved.',
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>Review decision</h2>
      <p>
        Drop: <strong>{state.toLowerCase()}</strong> · Creator:{' '}
        <strong>{suspended ? 'suspended' : 'active'}</strong>
      </p>
      {cleanupPending && (
        <p className="notice error">
          Cleanup pending. Retry before resuming this drop or restoring the
          creator.
        </p>
      )}
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="moderation-action">Action</label>
          <select
            id="moderation-action"
            value={action}
            disabled={busy}
            onChange={(e) => {
              setAction(e.target.value as keyof typeof actions);
              setConfirmed(false);
              requestId.current = null;
            }}
          >
            {Object.entries(actions).map(([value, [label]]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <p className="notice">
          {actions[action][1]} No payment is refunded automatically.
        </p>
        <div className="field">
          <label htmlFor="moderation-note">Reason / review notes</label>
          <textarea
            id="moderation-note"
            rows={4}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              requestId.current = null;
            }}
            disabled={busy}
            minLength={5}
            maxLength={1000}
            required
          />
        </div>
        <label className="moderation-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
            disabled={busy}
          />{' '}
          I’ve reviewed this action and its effect.
        </label>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy || !confirmed}>
          {busy ? 'Saving…' : actions[action][0]}
        </button>
      </form>
    </section>
  );
}
export function ReviewMedia({
  dropId,
  assets,
}: {
  dropId: string;
  assets: {
    id: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
  }[];
}) {
  const [show, setShow] = useState(false);
  return (
    <section className="panel">
      <h2>Content review</h2>
      <p>
        Reported material may be sensitive. Originals only load when you choose
        to view them.
      </p>
      <button className="secondary" onClick={() => setShow(!show)}>
        {show ? 'Hide originals' : 'View originals for review'}
      </button>
      {show && (
        <CreatorGallery
          label="Reported content"
          images={assets.map((a) => ({
            id: a.id,
            name: a.original_filename,
            mime: a.mime_type,
            size: a.size_bytes,
            url: `/api/admin/media?drop_id=${dropId}&asset_id=${a.id}`,
          }))}
        />
      )}
    </section>
  );
}
