'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
import { api } from '@/lib/client-api';
import { money } from '@/lib/format';
type Notice = {
  id: string;
  title: string;
  amount_cents: number;
  created_at: string;
  read_at: string | null;
  drops: { slug: string };
  purchases: { status: string };
};
export function SaleNotifications() {
  const [notices, setNotices] = useState<Notice[]>([]),
    [unread, setUnread] = useState(0);
  const [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [marking, setMarking] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const load = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const response = await fetch('/api/creator/notifications', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setNotices(data.notifications);
      setUnread(data.unread);
      setError('');
      setLoaded(true);
    } catch {
      setError('Couldn’t load notifications.');
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    const close = (event: PointerEvent) => {
      if (!details.current?.contains(event.target as Node) && details.current)
        details.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.current) {
        details.current.open = false;
        details.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [load]);
  return (
    <details
      ref={details}
      className="sale-notifications"
      onToggle={() => {
        if (details.current?.open) void load();
      }}
    >
      <summary
        aria-label={`Sale notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="notification-count">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </summary>
      <section className="notification-panel" aria-label="Sale notifications">
        <div className="notification-heading">
          <h2>Notifications</h2>
          {unread > 0 && (
            <button
              className="text-button"
              disabled={marking}
              onClick={async () => {
                setMarking(true);
                try {
                  await api(
                    '/api/creator/notifications',
                    { ids: notices.filter((n) => !n.read_at).map((n) => n.id) },
                    'PATCH',
                  );
                  await load();
                } catch {
                  setError('Couldn’t mark notifications as read.');
                } finally {
                  setMarking(false);
                }
              }}
            >
              {marking ? 'Saving…' : 'Mark shown as read'}
            </button>
          )}
        </div>
        {error && (
          <p role="status">
            {error}{' '}
            <button className="text-button" onClick={load}>
              Retry
            </button>
          </p>
        )}
        {!error && !loaded && <p>Loading notifications…</p>}
        {loaded && !notices.length && (
          <p>Your next sale starts here. Confirmed sales will appear here.</p>
        )}
        <ul>
          {notices.map((notice) => (
            <li key={notice.id} className={!notice.read_at ? 'unread' : ''}>
              <Link
                href={`/dashboard/drops/${notice.drops.slug}/share`}
                onClick={() => {
                  if (details.current) details.current.open = false;
                  if (!notice.read_at)
                    void api(
                      '/api/creator/notifications',
                      { ids: [notice.id] },
                      'PATCH',
                    )
                      .then(load)
                      .catch(() => {});
                }}
              >
                <strong>
                  {notice.purchases.status === 'REFUNDED'
                    ? 'Sale refunded'
                    : 'Your drop sold'}
                </strong>
                <span>{notice.title}</span>
                <small>
                  {money(notice.amount_cents)} USD before fees ·{' '}
                  {new Date(notice.created_at).toLocaleDateString()}
                </small>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          className="notification-earnings"
          href="/dashboard/payouts"
          onClick={() => {
            if (details.current) details.current.open = false;
          }}
        >
          View earnings & payouts ↗
        </Link>
      </section>
    </details>
  );
}
