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
        { opacity: 0, transform: 'translateY(16px)', filter: 'blur(5px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ],
      { duration: 560, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
    return () => animation?.cancel();
  }, [path]);
  return (
    <div ref={surface} className="page-motion">
      {children}
    </div>
  );
}
