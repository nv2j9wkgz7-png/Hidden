'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { rememberScroll, requestScrollRestore } from '@/lib/scroll-position';

export function NavigationLink({
  children,
  prefetch,
  href,
  restoreScroll = false,
  onNavigate,
  ...props
}: ComponentProps<typeof Link> & { restoreScroll?: boolean }) {
  return (
    <Link
      {...props}
      href={href}
      scroll={restoreScroll ? false : props.scroll}
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault() {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (cancelled) return;
        rememberScroll(location.pathname + location.search, {
          x: window.scrollX,
          y: window.scrollY,
        });
        if (restoreScroll && typeof href === 'string') {
          const target = new URL(href, location.href);
          requestScrollRestore(target.pathname + target.search);
        }
      }}
      // Warm the small, frequently used creation form without preloading every
      // dashboard query or triggering its welcome-email side effect.
      prefetch={prefetch ?? (href === '/new' ? true : undefined)}
    >
      {children}
    </Link>
  );
}
