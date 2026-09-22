'use client';
import { useState } from 'react';
import {
  Copy,
  MessageCircle,
  MessageSquare,
  Share2,
  Camera,
  Ghost,
} from 'lucide-react';

export function ShareDrop({
  url,
  title,
  price,
}: {
  url: string;
  title: string;
  price: string;
}) {
  const [notice, setNotice] = useState('');
  const [manual, setManual] = useState(false);
  const [message, setMessage] = useState(
    `Take a look at ${title} — unlock the image pack for ${price}.`,
  );
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
          <MessageCircle size={22} />
          <strong>WhatsApp</strong>
          <small>Choose a chat</small>
        </a>
        <button
          onClick={() =>
            copy(text, 'Copied! Open Instagram and paste into a chat or story.')
          }
        >
          <Camera size={22} />
          <strong>Instagram</strong>
          <small>Copy to paste</small>
        </button>
        <button
          onClick={() =>
            copy(
              text,
              'Copied! Open Snapchat and paste into a chat or attach the link to a Snap.',
            )
          }
        >
          <Ghost size={22} />
          <strong>Snapchat</strong>
          <small>Copy to paste</small>
        </button>
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
