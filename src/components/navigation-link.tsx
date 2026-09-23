'use client';

import Link, { useLinkStatus } from 'next/link';
import { createPortal } from 'react-dom';
import type { ComponentProps } from 'react';

function NavigationProgress() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return createPortal(
    <div
      className="navigation-progress"
      role="progressbar"
      aria-label="Opening page"
    />,
    document.body,
  );
}

export function NavigationLink({
  children,
  prefetch,
  href,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      href={href}
      // Warm the small, frequently used creation form without preloading every
      // dashboard query or triggering its welcome-email side effect.
      prefetch={prefetch ?? (href === '/new' ? true : undefined)}
    >
      {children}
      <NavigationProgress />
    </Link>
  );
}
