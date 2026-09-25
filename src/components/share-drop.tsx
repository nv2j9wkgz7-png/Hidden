'use client';
import { notifyCopied } from './toast';
import { useEffect, useState } from 'react';
import { fileSize } from '@/lib/format';
import { Copy, MessageCircle, Share2, Link2 } from 'lucide-react';

export function ShareDrop({
  url,
  title,
  price,
  count,
  bytes,
  compact = false,
}: {
  url: string;
  title: string;
  price: string;
  count: number;
  bytes: number;
  compact?: boolean;
}) {
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState(false);
  const message = `${title} — ${count} hidden files · ${fileSize(bytes)} · ${price} USD. Preview, pay, and unlock the originals.`;
  const [card, setCard] = useState<File>();
  useEffect(() => {
    if (compact) return;
    const controller = new AbortController();
    fetch(`${url}/card?v=14`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (!controller.signal.aborted)
          setCard(
            new File([blob], 'hidden-preview.jpg', { type: 'image/jpeg' }),
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [url, compact]);
  async function instagram() {
    if (navigator.share) {
      setNotice(
        'Choose Instagram in the share menu. Some apps omit captions or links; check the message before sending.',
      );
      try {
        const files =
          card && navigator.canShare?.({ files: [card] }) ? [card] : undefined;
        await navigator.share({
          title,
          text,
          url,
          ...(files ? { files } : {}),
        });
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          setManual(true);
          setNotice(
            'Instagram sharing is unavailable here. Copy the message below or download the preview card.',
          );
        }
      }
    } else {
      window.open(
        'https://www.instagram.com/direct/inbox/',
        '_blank',
        'noopener,noreferrer',
      );
      await copy(
        text,
        'Instagram opened. Message copied; paste it into your chosen conversation. This browser cannot prefill Instagram messages.',
      );
    }
  }
  const text = `${message.trim()}\n${url}`;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(
    new URL(url).hostname,
  );
  async function copy(value: string, confirmation: string) {
    try {
      await navigator.clipboard.writeText(value);
      notifyCopied(value === url ? 'Link copied' : 'Message and link copied');
      setNotice(confirmation);
      setManual(false);
    } catch {
      setManual(true);
      setNotice('Select and copy the text below.');
    }
  }
  async function share() {
    if (!navigator.share) {
      await copy(text, 'Message and link copied. Paste them into any app.');
      return;
    }
    try {
      await navigator.share({ title, text: message, url });
      setNotice('Share menu closed.');
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setManual(true);
        setNotice('Sharing is unavailable here. Copy your message below.');
      }
    }
  }
  if (compact)
    return (
      <div className="studio-share">
        <div className="studio-share-bar">
          <button
            type="button"
            className="primary"
            onClick={() => copy(url, '')}
          >
            <Copy size={18} aria-hidden="true" />
            Copy link
          </button>
          <button type="button" className="secondary" onClick={share}>
            <Share2 size={18} aria-hidden="true" />
            Share
          </button>
        </div>
        {manual && (
          <textarea
            aria-label="Message and link to copy"
            readOnly
            rows={3}
            value={text}
            onFocus={(e) => e.target.select()}
          />
        )}
        {notice && (
          <p className="share-notice" role="status">
            {notice}
          </p>
        )}
      </div>
    );
  return (
    <>
      <label className="share-label" htmlFor="purchase-link">
        Your purchase link
      </label>
      <div className="share-link-row">
        <input
          id="purchase-link"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button
          className="button"
          onClick={() => copy(url, 'Purchase link copied!')}
        >
          <Copy size={17} /> Copy link
        </button>
      </div>
      {local && (
        <p className="share-local">
          Local preview: this link only works on this computer. Once Hidn is
          hosted, you can send it to buyers.
        </p>
      )}
      <h3 className="share-label">Share your drop</h3>
      <div className="share-options">
        <button onClick={() => copy(url, 'Purchase link copied!')}>
          <span className="share-circle share-copy">
            <Link2 size={30} />
          </span>
          <strong>Copy Link</strong>
        </button>
        <a href={`sms:?body=${encodeURIComponent(text)}`}>
          <span className="share-circle share-messages">
            <MessageCircle size={30} fill="currentColor" />
          </span>
          <strong>Messages</strong>
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="share-circle share-whatsapp">
            <img src="/social/whatsapp.svg" alt="" width={32} height={32} />
          </span>
          <strong>WhatsApp</strong>
        </a>
        <button onClick={instagram}>
          <span className="share-circle share-instagram">
            <img src="/social/instagram.svg" alt="" width={32} height={32} />
          </span>
          <strong>Instagram</strong>
        </button>
        <a
          href={`https://www.snapchat.com/share?link=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="share-circle share-snapchat">
            <img src="/social/snapchat.svg" alt="" width={32} height={32} />
          </span>
          <strong>Snapchat</strong>
        </a>
        <button onClick={share}>
          <span className="share-circle share-more">
            <Share2 size={28} />
          </span>
          <strong>More apps</strong>
        </button>
      </div>
      <section className="compact-link-preview" aria-label="Link preview">
        <img
          src={`${url}/card?v=14`}
          alt="Blurred collection cover with the Hidn H watermark"
          width={112}
          height={112}
        />
        <div>
          <small>{new URL(url).host}</small>
          <strong>{title}</strong>
          <span>
            {count} files · {price} USD
          </span>
          <span className="compact-preview-caption">
            Preview, pay, and unlock.
          </span>
        </div>
      </section>
      <p className="share-notice" role="status" aria-live="polite">
        {notice}
      </p>
      {manual && (
        <textarea
          aria-label="Message and link to copy"
          readOnly
          rows={4}
          value={text}
          onFocus={(e) => e.target.select()}
        />
      )}
    </>
  );
}
