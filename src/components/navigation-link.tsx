'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

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
    </Link>
  );
}
