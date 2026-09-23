import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AccountMenu } from '@/components/account-menu';
import './globals.css';
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
              className="brand-wordmark"
              src="/hidden-wordmark.svg?v=hidn1"
              alt="Hidn"
              width={132}
              height={44}
            />
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
          <span>Good images. A simple exchange.</span>
          <span>Hidn / Image delivery</span>
        </footer>
      </body>
    </html>
  );
}
