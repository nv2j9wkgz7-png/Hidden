import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import { PageMotion } from '@/components/page-motion';
import { AccountMenu } from '@/components/account-menu';
import './globals.css';
import './studio.css';
import './ribbon.css';
import './examples.css';
const outfit = localFont({
  src: [
    {
      path: '../../public/fonts/outfit-regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/outfit-semibold.ttf',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-hidn',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: 'Hidn — image drops', template: '%s · Hidn' },
  description:
    'Share and sell private photo, artwork, and image collections with one simple link.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Hidn home">
            <img
              className="ribbon-wordmark"
              src="/hidn-ribbon-wordmark.svg"
              alt=""
              width={140}
              height={54}
            />
          </Link>
          <nav>
            <Link href="/dashboard">My drops</Link>
            <Suspense fallback={null}>
              <AccountMenu />
            </Suspense>
          </nav>
        </header>
        <main>
          <PageMotion>{children}</PageMotion>
        </main>
        <footer>
          <Link href="/" className="footer-brand">
            Hidn <span>Made to share. Yours to sell.</span>
          </Link>
          <span>Your content. Your price. One link.</span>
        </footer>
      </body>
    </html>
  );
}
