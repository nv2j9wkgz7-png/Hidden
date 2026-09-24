'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function PageMotion({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const previousPath = useRef(path);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The server-rendered page is already visible. Replaying an entrance after
    // hydration causes a flash and repaints every blurred/rotated preview.
    if (previousPath.current === path) return;
    previousPath.current = path;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = surface.current?.animate(
      [{ opacity: 0.98 }, { opacity: 1 }],
      { duration: 120, easing: 'ease-out' },
    );
    return () => animation?.cancel();
  }, [path]);
  return (
    <div ref={surface} className="page-motion">
      {children}
    </div>
  );
}
