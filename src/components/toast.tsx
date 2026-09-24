'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
export function notifyCopied(message = 'Link copied') {
  window.dispatchEvent(new CustomEvent('hidn:copied', { detail: message }));
}
export function CopyToast() {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (event: Event) => {
      clearTimeout(timer);
      setToast({
        message: (event as CustomEvent<string>).detail,
        id: Date.now(),
      });
      timer = setTimeout(() => setToast(null), 2400);
    };
    window.addEventListener('hidn:copied', show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('hidn:copied', show);
    };
  }, []);
  return (
    <div
      className="copy-toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toast && (
        <div key={toast.id} className="copy-toast">
          <Check size={18} aria-hidden="true" />
          {toast.message}
        </div>
      )}
    </div>
  );
}
