'use client';
import { useEffect } from 'react';
// A view is one visible visit per tab/drop/UTC day, not a unique person.
export function TrackDropView({ dropId }: { dropId: string }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    let fallback: string | undefined;
    async function record() {
      if (sent || document.visibilityState !== 'visible') return;
      sent = true;
      const key = `hidn-view:${dropId}`;
      const day = new Date().toISOString().slice(0, 10);
      let session = (fallback ||= crypto.randomUUID());
      try {
        const prior = JSON.parse(sessionStorage.getItem(key) || 'null');
        if (prior?.day === day && typeof prior.session === 'string')
          session = prior.session;
        sessionStorage.setItem(key, JSON.stringify({ day, session }));
      } catch {
        /* Analytics must never prevent access if storage is disabled. */
      }
      try {
        await fetch('/api/analytics/view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drop_id: dropId, session }),
          keepalive: true,
        });
      } catch {
        /* Best effort, with no buyer-facing error. */
      }
    }
    function visible() {
      clearTimeout(timer);
      if (!sent && document.visibilityState === 'visible')
        timer = setTimeout(record, 1000);
    }
    visible();
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [dropId]);
  return null;
}
