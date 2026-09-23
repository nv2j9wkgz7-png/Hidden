import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AccountMenu } from '@/components/account-menu';
import './globals.css';
import './studio.css';
export const metadata: Metadata = {
  title: { default: 'Hidn — image drops', template: '%s · Hidn' },
  description: 'A simple way to share images worth paying for.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Hidn home">
            <img
              className="brand-ribbon"
              src="/hidn-arrow-mark.svg"
              alt=""
              width={48}
              height={48}
            />
            <span className="brand-lettering" aria-hidden="true">
              idn
            </span>
          </Link>
          <nav>
            <Link href="/dashboard">My drops</Link>
            <Suspense fallback={null}>
              <AccountMenu />
            </Suspense>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <Link href="/" className="footer-brand">
            Hidn <span>Made to be discovered.</span>
          </Link>
          <span>Private drops. Beautifully delivered.</span>
        </footer>
      </body>
    </html>
  );
}
