'use client';
import { notifyCopied } from './toast';
import { useState } from 'react';
export function CopyButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState('');
  return (
    <>
      <button
        className="text-button"
        onClick={async () => {
          const url = new URL(path, window.location.origin).href;
          try {
            await navigator.clipboard.writeText(url);
            notifyCopied();
            setFallback('');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setFallback(url);
          }
        }}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      {fallback && (
        <input
          aria-label="Shareable link"
          readOnly
          value={fallback}
          onFocus={(e) => e.target.select()}
        />
      )}
    </>
  );
}
