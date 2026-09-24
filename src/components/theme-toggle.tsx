'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [blackout, setBlackout] = useState(false);
  useEffect(() => {
    const update = () =>
      setBlackout(document.documentElement.dataset.theme === 'blackout');
    update();
    const storage = (event: StorageEvent) => {
      if (event.key === 'hidn-theme') {
        document.documentElement.dataset.theme =
          event.newValue === 'blackout' ? 'blackout' : 'light';
        update();
      }
    };
    window.addEventListener('storage', storage);
    window.addEventListener('hidn:theme', update);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener('hidn:theme', update);
    };
  }, []);
  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      aria-label="Blackout mode"
      aria-pressed={blackout}
      title={blackout ? 'Turn off Blackout mode' : 'Turn on Blackout mode'}
      onClick={() => {
        const value = blackout ? 'light' : 'blackout';
        document.documentElement.dataset.theme = value;
        setBlackout(!blackout);
        try {
          localStorage.setItem('hidn-theme', value);
        } catch {}
        window.dispatchEvent(new Event('hidn:theme'));
      }}
    >
      {blackout ? <Sun size={18} /> : <Moon size={18} />}{' '}
      {!compact && (
        <>
          <span>Blackout mode</span>
          <span className="theme-toggle-value">{blackout ? 'On' : 'Off'}</span>
        </>
      )}
    </button>
  );
}
