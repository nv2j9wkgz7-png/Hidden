'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { rememberScroll, takeScrollRestore } from '@/lib/scroll-position';

// Browser Back/Forward retain their native behavior. Explicit in-app Back links
// request the last position on their destination, rather than a fresh top visit.
export function ScrollRestoration() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  useEffect(() => {
    const url = location.pathname + location.search;
    const target = takeScrollRestore(url);
    let restoring = Boolean(target);
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function save() {
      // Navigation may update the URL before the old route effect is cleaned up.
      if (!restoring && location.pathname + location.search === url)
        rememberScroll(url, { x: window.scrollX, y: window.scrollY });
    }
    function finish() {
      restoring = false;
      observer?.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      save();
    }
    function restore() {
      if (!target || !restoring) return;
      window.scrollTo({ left: target.x, top: target.y, behavior: 'instant' });
      // A streamed page can initially be too short. Retry as its content arrives.
      if (Math.abs(window.scrollY - target.y) < 2) finish();
    }
    if (target) {
      observer = new ResizeObserver(restore);
      observer.observe(document.body);
      frame = requestAnimationFrame(restore);
      timer = setTimeout(finish, 4000);
    }
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('pagehide', save);
    // Don't fight a user who starts scrolling while the destination is loading.
    window.addEventListener('wheel', finish, { passive: true });
    window.addEventListener('touchstart', finish, { passive: true });
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
      window.removeEventListener('pagehide', save);
      window.removeEventListener('wheel', finish);
      window.removeEventListener('touchstart', finish);
    };
  }, [pathname, query]);
  return null;
}
