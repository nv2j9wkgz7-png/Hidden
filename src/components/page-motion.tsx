'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function PageMotion({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = surface.current?.animate(
      [
        { opacity: 0.94, transform: 'translateY(3px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 160, easing: 'ease-out' },
    );
    return () => animation?.cancel();
  }, [path]);
  return (
    <div ref={surface} className="page-motion">
      {children}
    </div>
  );
}
