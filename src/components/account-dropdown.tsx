'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function AccountDropdown({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  return (
    <details
      ref={ref}
      className="account-menu"
      onClick={(event) => {
        if (
          (event.target as HTMLElement).closest(
            '.account-dropdown a, .account-dropdown button',
          ) &&
          ref.current
        )
          ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
