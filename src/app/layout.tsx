import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers2 } from 'lucide-react';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Still — image drops', template: '%s · Still' },
  description: 'A simple way to share images worth paying for.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Still home">
            <span className="brand-icon">
              <Layers2 size={21} />
            </span>
            still<span className="version">V0</span>
          </Link>
          <nav>
            <Link href="/dashboard">My drops</Link>
            <Link className="button small" href="/new">
              New drop <span aria-hidden>＋</span>
            </Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <span>Good images. A simple exchange.</span>
          <span>Still / Image delivery</span>
        </footer>
      </body>
    </html>
  );
}
