'use client';
import { NavigationLink as Link } from './navigation-link';
import { notifyCopied } from './toast';
import { PurchaseVerification } from './purchase-verification';
import { FreePreview } from './free-preview';
import { PaidGallery } from './paid-gallery';
import { useEffect, useRef, useState } from 'react';
import {
  LockKeyhole,
  Check,
  Download,
  ShieldCheck,
  ImageIcon,
  Link2,
  Share2,
  Mail,
} from 'lucide-react';
import { zip } from 'fflate';
import { api } from '@/lib/client-api';
import { money, fileSize } from '@/lib/format';
type Asset = {
  id: string;
  preview_url: string;
  is_public_preview?: boolean;
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
    slug?: string;
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
  const [accountSaved, setAccountSaved] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [emailMessage, setEmailMessage] = useState('');
  const emailRequest = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'PAID' || !expiresAt) return;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() >= Date.parse(expiresAt)) {
        setStatus('EXPIRED');
        setRecovery('');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status, expiresAt]);
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
        setAccountSaved(data.account_saved === true);
        setExpiresAt(data.expires_at || null);
        setNow(Date.now());
        if (data.status === 'PENDING' && attempts++ < 60)
          timer = setTimeout(check, 3000);
        else if (data.status === 'PENDING') setWaited(true);
        else if (data.status === 'PAID') timer = setTimeout(check, 30000);
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
  async function saveAccess(method: 'copy' | 'share' | 'download' = 'copy') {
    setError('');
    try {
      const response = await fetch(
        `/api/access?drop_id=${drop.id}&recovery=1`,
        { cache: 'no-store' },
      );
      const data = await response.json();
      if (!response.ok || (!data.token && !data.library_url))
        throw new Error('Access could not be verified.');
      if (data.library_url) {
        window.location.assign(data.library_url);
        return;
      }
      const link = `${window.location.origin}${window.location.pathname}#access=${data.token}`;
      setRecovery(link);
      if (method === 'download') {
        saveBlob(
          new Blob(
            [
              `${drop.title}\n\nPrivate purchase access:\n${link}\n\nAccess expires: ${data.expires_at}\nDownload your originals before that time. A new browser must verify your checkout email before opening the files. Do not share verification codes.\n`,
            ],
            { type: 'text/plain;charset=utf-8' },
          ),
          'hidn-private-access.txt',
        );
        return;
      }
      if (method === 'share' && navigator.share) {
        try {
          await navigator.share({
            title: `${drop.title} — private access`,
            url: link,
          });
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
          setError(
            'Sharing isn’t available here. Copy or download the access link instead.',
          );
        }
        return;
      }
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
  async function emailZip() {
    setBusy('email');
    setError('');
    setEmailMessage('');
    emailRequest.current ||= crypto.randomUUID();
    try {
      const result = await api('/api/purchase-email', {
        drop_id: drop.id,
        request_id: emailRequest.current,
      });
      setEmailMessage(
        result.delivery === 'attachment'
          ? 'ZIP sent to your checkout email address.'
          : 'The collection is too large to attach. A ZIP download link was sent to your checkout email address.',
      );
      emailRequest.current = null;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Email failed. Please download your files here instead.',
      );
    } finally {
      setBusy('');
    }
  }
  if (status === 'UNAVAILABLE')
    return (
      <section className="panel">
        <h1>This drop is unavailable.</h1>
        <p>Access to this content has been removed following review.</p>
        <Link href="/help">Get help</Link>
      </section>
    );
  const paid = status === 'PAID';
  const remainingMinutes = expiresAt
    ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 60000))
    : 0;
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
          collection ·{' '}
          {accountSaved
            ? 'Saved in your private library.'
            : '72-hour guest access. Save to an account for ongoing access.'}
        </p>
      </div>
      <div className={`buyer-layout${paid ? ' buyer-paid' : ''}`}>
        {paid ? (
          <PaidGallery
            dropId={drop.id}
            assets={assets}
            busy={!!busy}
            download={download}
          />
        ) : (
          <div className="image-grid">
            {assets.map((asset, index) =>
              asset.is_public_preview ? (
                <FreePreview key={asset.id} asset={asset} />
              ) : (
                <article className="image-card" key={asset.id}>
                  <img
                    src={asset.preview_url}
                    alt={`Locked preview ${index + 1}`}
                    width={800}
                    height={600}
                  />
                  <div className="image-caption">
                    <span>
                      {asset.mime_type?.startsWith('video/')
                        ? 'Video'
                        : 'Photo'}{' '}
                      {String(index + 1).padStart(2, '0')} ·{' '}
                      {fileSize(asset.size_bytes)}
                    </span>
                    <LockKeyhole size={14} color="#8a829f" />
                  </div>
                </article>
              ),
            )}
          </div>
        )}
        <aside className="panel checkout-panel">
          <div className="status-icon">
            {paid ? <Check /> : <LockKeyhole />}
          </div>
          <span className={`badge ${paid ? 'paid' : ''}`}>
            {paid
              ? 'Payment confirmed'
              : status === 'PENDING'
                ? 'Awaiting confirmation'
                : status === 'VERIFICATION_REQUIRED'
                  ? 'Verify to open'
                  : status === 'EXPIRED'
                    ? 'Access expired'
                    : status === 'REFUNDED'
                      ? 'Payment refunded'
                      : 'Locked collection'}
          </span>
          <h2 style={{ marginTop: 18 }}>
            {paid
              ? 'It’s all yours.'
              : status === 'VERIFICATION_REQUIRED'
                ? 'Your purchase, protected.'
                : status === 'EXPIRED'
                  ? 'Your access window has ended.'
                  : salesClosed
                    ? 'This drop is closed.'
                    : 'Unlock the originals.'}
          </h2>
          {paid ? (
            <p className="hint">
              Tap a photo to view it full size, or play a video. Download your
              originals
              {accountSaved
                ? ' whenever you like while the files remain available.'
                : ' before your 72-hour guest access ends, or save this purchase to your account.'}
            </p>
          ) : status === 'VERIFICATION_REQUIRED' ? (
            <p className="hint">
              Confirm it’s you to open this purchase in this browser. You don’t
              need to pay again.
            </p>
          ) : status === 'EXPIRED' ? (
            <p className="hint">
              Guest access ends 72 hours after payment. Recover your purchase
              using your checkout email to save it to an account. Downloaded
              files and email attachments are yours to keep.
            </p>
          ) : (
            <>
              <div className="price">
                {money(drop.price_cents)} <small>USD</small>
              </div>
              <p className="hint">
                One-time payment. All {assets.length} files ·{' '}
                {fileSize(assets.reduce((n, a) => n + a.size_bytes, 0))} total.{' '}
                No login needed. View and download for 72 hours as a guest, or
                save to an account for ongoing access.
              </p>
            </>
          )}
          {paid && expiresAt && (
            <div className="notice purchase-deadline">
              <strong>
                {Math.floor(remainingMinutes / 60)}h {remainingMinutes % 60}m
                left to download
              </strong>
              <p className="hint">
                Guest access ends {new Date(expiresAt).toLocaleString()}.
                Download your files or save to your account before then.
                Reopening or emailing a link does not reset this deadline.
              </p>
            </div>
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
                {accountSaved ? (
                  <div className="notice">
                    <strong>Saved to My purchases</strong>
                    <p className="hint">
                      Log in on any device to find all your purchased photos and
                      videos.
                    </p>
                    <Link className="secondary full" href="/purchases">
                      Open My purchases ↗
                    </Link>
                  </div>
                ) : (
                  <>
                    {drop.slug && (
                      <div className="notice">
                        <Link
                          className="secondary full"
                          href={`/purchases/save/${drop.slug}`}
                        >
                          Save to my account
                        </Link>
                        <p className="hint">
                          Optional. Keep access in your private library while
                          the files remain available.
                        </p>
                      </div>
                    )}
                    <button
                      className="secondary full"
                      style={{ marginTop: 10 }}
                      onClick={() => saveAccess()}
                    >
                      <Link2 size={14} /> Copy private access link
                    </button>
                    <button
                      className="secondary full"
                      style={{ marginTop: 10 }}
                      onClick={() => saveAccess('share')}
                    >
                      <Share2 size={14} /> Save access link to another app
                    </button>
                    <button
                      className="text-button full"
                      style={{ marginTop: 10 }}
                      onClick={() => saveAccess('download')}
                    >
                      <Download size={14} /> Download access link
                    </button>
                    <p className="hint">
                      Opening this link in a new browser requires a code sent to
                      your checkout email. Guest access still ends after 72
                      hours.
                    </p>
                  </>
                )}
                <button
                  className="secondary full"
                  disabled={!!busy}
                  onClick={emailZip}
                >
                  <Mail size={16} />{' '}
                  {busy === 'email'
                    ? 'Preparing email…'
                    : 'Email ZIP to checkout address'}
                </button>
                <p className="hint">
                  Only sent when you ask. ZIPs up to 15 MB are attached; larger
                  collections get{' '}
                  {accountSaved
                    ? 'a link to your library that requires your login.'
                    : 'a download link with the same deadline.'}
                </p>
                {emailMessage && (
                  <p className="notice" role="status">
                    {emailMessage}
                  </p>
                )}
                {recovery && (
                  <div className="notice">
                    <p className="hint">
                      Use this private link on another device before the
                      deadline. You’ll verify your checkout email before opening
                      the files in a new browser.
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
            ) : status === 'VERIFICATION_REQUIRED' ? (
              <PurchaseVerification
                dropId={drop.id}
                onVerified={() => window.location.reload()}
              />
            ) : status === 'EXPIRED' ? (
              <>
                <Link className="primary full" href="/purchases/recover">
                  Recover your purchase
                </Link>
                <p className="hint">
                  Already saved it?{' '}
                  <Link href="/login?next=purchases">
                    Log in to My purchases
                  </Link>
                  .
                </p>
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
          {status === 'LOCKED' && !previewOnly && (
            <p className="hint">
              Already bought this?{' '}
              <Link href="/login?next=purchases">Log in</Link> or{' '}
              <Link href="/purchases/recover">recover your purchase</Link>.
            </p>
          )}
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
              ? accountSaved
                ? 'Saved purchases require your login. Downloads are yours to keep.'
                : 'Guest access lasts 72 hours. Save to your account for ongoing access.'
              : status === 'EXPIRED'
                ? 'The original payment deadline cannot be extended by copying or emailing a link.'
                : 'No account needed · Secure checkout by Stripe'}
          </p>
        </aside>
      </div>
    </>
  );
}
