'use client';
import { useEffect, useState } from 'react';
import { fileSize } from '@/lib/format';
import { Copy, MessageSquare, Share2 } from 'lucide-react';

export function ShareDrop({
  url,
  title,
  price,
  count,
  bytes,
}: {
  url: string;
  title: string;
  price: string;
  count: number;
  bytes: number;
}) {
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState(
    `${title} — ${count} hidden images · ${fileSize(bytes)} · ${price} USD. Preview, pay, and unlock the originals.`,
  );
  const [card, setCard] = useState<File>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${url}/card`, { signal: controller.signal })
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
  }, [url]);
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
          Local preview: this link only works on this computer. Once Hidden is
          hosted, you can send it to buyers.
        </p>
      )}
      <label className="share-label" htmlFor="share-message">
        Add a message
      </label>
      <textarea
        id="share-message"
        rows={3}
        maxLength={1000}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="share-card-preview">
        <img
          src={`${url}/card`}
          alt={`Share card: ${count} blurred images, ${fileSize(bytes)}, ${price} USD`}
          width={1200}
          height={630}
        />
        <p className="hint">
          Your link preview. Appearance varies by app.{' '}
          <a href={`${url}/card`} download="hidden-preview.jpg">
            Download preview card
          </a>
        </p>
      </div>
      <h3 className="share-label">Share your drop</h3>
      <div className="share-options">
        <a href={`sms:?body=${encodeURIComponent(text)}`}>
          <MessageSquare size={22} />
          <strong>SMS</strong>
          <small>Choose recipients</small>
        </a>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/social/whatsapp.svg" alt="" width={28} height={28} />
          <strong>WhatsApp</strong>
          <small>Choose a chat</small>
        </a>
        <button onClick={instagram}>
          <img src="/social/instagram.svg" alt="" width={28} height={28} />
          <strong>Instagram</strong>
          <small>Choose in share menu</small>
        </button>
        <a
          href={`https://www.snapchat.com/share?link=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src="/social/snapchat.svg" alt="" width={28} height={28} />
          <strong>Snapchat</strong>
          <small>Open sharing</small>
        </a>
        <button onClick={share}>
          <Share2 size={22} />
          <strong>More apps</strong>
          <small>Device share menu</small>
        </button>
      </div>
      <p className="hint">
        Send to more than one person using a group chat or your app’s recipient
        picker. Everyone gets the same purchase link and unlocks separately.
      </p>
      <button
        className="text-button"
        onClick={() => copy(text, 'Message and purchase link copied!')}
      >
        <Copy size={14} /> Copy message + link
      </button>
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
