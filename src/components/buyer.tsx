'use client';
import { notifyCopied } from './toast';
import { useEffect, useState } from 'react';
import {
  LockKeyhole,
  Check,
  Download,
  ShieldCheck,
  ImageIcon,
  Link2,
} from 'lucide-react';
import { zip } from 'fflate';
import { api } from '@/lib/client-api';
import { money, fileSize } from '@/lib/format';
type Asset = {
  id: string;
  preview_url: string;
  original_filename: string;
  size_bytes: number;
  mime_type?: string;
};
type DownloadFile = { id: string; filename: string; url: string };
export function Buyer({
  drop,
  assets,
  salesClosed = false,
  previewOnly = false,
}: {
  drop: {
    id: string;
    title: string;
    description?: string;
    price_cents: number;
  };
  assets: Asset[];
  salesClosed?: boolean;
  previewOnly?: boolean;
}) {
  const [status, setStatus] = useState(previewOnly ? 'LOCKED' : 'LOADING'),
    [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [recovery, setRecovery] = useState(''),
    [waited, setWaited] = useState(false);
  useEffect(() => {
    if (previewOnly) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function check() {
      try {
        const response = await fetch(`/api/access?drop_id=${drop.id}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (cancelled) return;
        setStatus(data.status);
        if (data.status === 'PENDING' && attempts++ < 60)
          timer = setTimeout(check, 3000);
        else if (data.status === 'PENDING') setWaited(true);
      } catch {
        if (!cancelled) {
          setError('Could not check purchase access. Refresh to try again.');
          setStatus('LOCKED');
        }
      }
    }
    async function start() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get(
        'access',
      );
      if (token) {
        window.history.replaceState(null, '', window.location.pathname);
        try {
          await api('/api/access', { drop_id: drop.id, token });
        } catch (error) {
          if (!cancelled)
            setError(
              error instanceof Error ? error.message : 'Invalid access link.',
            );
        }
      }
      await check();
    }
    void start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [drop.id, previewOnly]);
  async function checkout() {
    if (previewOnly) {
      setError(
        'This is your buyer preview. Publish your drop to accept payments.',
      );
      return;
    }
    setBusy('checkout');
    setError('');
    try {
      const { url } = await api('/api/checkout', { drop_id: drop.id });
      window.location.assign(url);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not start checkout.',
      );
      setBusy('');
    }
  }
  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function download(assetId?: string) {
    setBusy(assetId || 'all');
    setError('');
    try {
      const { files }: { files: DownloadFile[] } = await api('/api/downloads', {
        drop_id: drop.id,
        asset_id: assetId,
      });
      if (assetId) {
        const link = document.createElement('a');
        link.href = files[0].url;
        link.rel = 'noreferrer';
        link.click();
      } else {
        const entries: Record<string, Uint8Array> = {};
        // Fetch in parallel immediately so each URL is used well inside its 60-second TTL.
        await Promise.all(
          files.map(async (file) => {
            const response = await fetch(file.url, {
              referrerPolicy: 'no-referrer',
            });
            if (!response.ok)
              throw new Error('Download expired or failed. Please try again.');
            entries[file.filename] = new Uint8Array(
              await response.arrayBuffer(),
            );
          }),
        );
        const archive = await new Promise<Uint8Array<ArrayBuffer>>(
          (resolve, reject) =>
            zip(entries, { level: 0 }, (error, data) =>
              error ? reject(error) : resolve(data as Uint8Array<ArrayBuffer>),
            ),
        );
        saveBlob(
          new Blob([archive], { type: 'application/zip' }),
          'hidden-drop.zip',
        );
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Download failed.');
    } finally {
      setBusy('');
    }
  }
  async function saveAccess() {
    setError('');
    try {
      const response = await fetch(
        `/api/access?drop_id=${drop.id}&recovery=1`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok || !data.token)
        throw new Error('Access could not be verified.');
      const link = `${window.location.origin}${window.location.pathname}#access=${data.token}`;
      setRecovery(link);
      try {
        await navigator.clipboard.writeText(link);
        notifyCopied('Access link copied');
      } catch {
        /* Show a selectable link as fallback. */
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to save access.',
      );
    }
  }
  const paid = status === 'PAID';
  return (
    <>
      <div className="buyer-heading">
        <img
          className="buyer-brand-mark"
          src="/hidn-arrow-mark.svg"
          alt=""
          width={64}
          height={64}
        />
        <div className="eyebrow">A private content drop</div>
        <h1>{drop.title}</h1>
        {drop.description && (
          <p className="drop-description">{drop.description}</p>
        )}
        <p>
          {assets.length} files ·{' '}
          {fileSize(assets.reduce((n, a) => n + a.size_bytes, 0))} · One
          collection, yours to keep.
        </p>
      </div>
      <div className="buyer-layout">
        <div className="image-grid">
          {assets.map((asset, index) => (
            <article className="image-card" key={asset.id}>
              <img
                src={asset.preview_url}
                alt={`Locked preview ${index + 1}`}
                width={800}
                height={600}
              />
              <div className="image-caption">
                <span>
                  {asset.mime_type?.startsWith('video/') ? 'Video' : 'Photo'}{' '}
                  {String(index + 1).padStart(2, '0')} ·{' '}
                  {fileSize(asset.size_bytes)}
                </span>
                {paid ? (
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() => download(asset.id)}
                    aria-label={`Download file ${index + 1}`}
                  >
                    <Download size={17} />
                  </button>
                ) : (
                  <LockKeyhole size={14} color="#8a829f" />
                )}
              </div>
            </article>
          ))}
        </div>
        <aside className="panel checkout-panel">
          <div className="status-icon">
            {paid ? <Check /> : <LockKeyhole />}
          </div>
          <span className={`badge ${paid ? 'paid' : ''}`}>
            {paid
              ? 'Payment confirmed'
              : status === 'PENDING'
                ? 'Awaiting confirmation'
                : status === 'REFUNDED'
                  ? 'Payment refunded'
                  : 'Locked collection'}
          </span>
          <h2 style={{ marginTop: 18 }}>
            {paid
              ? 'It’s all yours.'
              : salesClosed
                ? 'This drop is closed.'
                : 'Unlock the originals.'}
          </h2>
          {paid ? (
            <p className="hint">
              Download your original files below. Previews remain protected on
              this page.
            </p>
          ) : (
            <>
              <div className="price">
                {money(drop.price_cents)} <small>USD</small>
              </div>
              <p className="hint">
                One-time payment. All {assets.length} files ·{' '}
                {fileSize(assets.reduce((n, a) => n + a.size_bytes, 0))} total.
              </p>
            </>
          )}
          {salesClosed && !paid && (
            <p className="notice">
              The creator has stopped sales. If you already paid, use your saved
              private access link or the browser you purchased in to access your
              files.
            </p>
          )}
          <hr className="divider" />
          <div className="benefit">
            <ImageIcon size={16} /> Full-resolution originals
          </div>
          <div className="benefit">
            <Download size={16} /> Individual files + ZIP download
          </div>
          <div className="benefit">
            <ShieldCheck size={16} /> Secure, private delivery
          </div>
          <div style={{ marginTop: 24 }}>
            {paid ? (
              <>
                <button
                  className="primary full"
                  disabled={!!busy}
                  onClick={() => download()}
                >
                  <Download size={16} />
                  {busy === 'all' ? 'Preparing ZIP…' : 'Download all'}
                </button>
                <button
                  className="secondary full"
                  style={{ marginTop: 10 }}
                  onClick={saveAccess}
                >
                  <Link2 size={14} /> Save private access link
                </button>
                {recovery && (
                  <div className="notice">
                    <p className="hint">
                      Keep this link to return on another device. Anyone with it
                      can access your purchase.
                    </p>
                    <input
                      className="full"
                      aria-label="Private access link"
                      value={recovery}
                      readOnly
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                )}
              </>
            ) : (
              <button
                className="primary full"
                disabled={salesClosed || !!busy || status === 'LOADING'}
                onClick={checkout}
              >
                {salesClosed
                  ? 'Sales closed'
                  : status === 'LOADING'
                    ? 'Checking access…'
                    : busy
                      ? 'Opening checkout…'
                      : status === 'PENDING'
                        ? 'Resume checkout'
                        : `Unlock for ${money(drop.price_cents)}`}
              </button>
            )}
          </div>
          {status === 'PENDING' && (
            <p role="status" className="notice">
              {waited
                ? 'Still waiting for payment confirmation. Refresh this page shortly.'
                : 'If you paid, your files will unlock automatically when payment is confirmed. Please don’t pay again.'}
            </p>
          )}
          {status === 'PENDING' && (
            <button
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Check payment again
            </button>
          )}
          {status === 'REFUNDED' && (
            <p className="notice">
              This purchase was refunded. Original downloads are no longer
              available.
            </p>
          )}
          {error && (
            <div role="alert" className="notice error">
              {error}
            </div>
          )}
          <p className="payment-note">
            {paid
              ? 'Signed download links expire after 60 seconds.'
              : 'No account needed · Secure checkout by Stripe'}
          </p>
        </aside>
      </div>
    </>
  );
}
