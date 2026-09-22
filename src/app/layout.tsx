import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Hidden — image drops', template: '%s · Hidden' },
  description: 'A simple way to share images worth paying for.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Hidden home">
            <span className="brand-icon">
              <img src="/hidden-logo.svg" alt="" width={44} height={44} />
            </span>
            Hidden<span className="version">V0</span>
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
          <span>Hidden / Image delivery</span>
        </footer>
      </body>
    </html>
  );
}
