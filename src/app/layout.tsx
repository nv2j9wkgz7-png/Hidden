import type { Metadata } from 'next';
import { NavigationLink as Link } from '@/components/navigation-link';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import { PageMotion } from '@/components/page-motion';
import { AccountMenu } from '@/components/account-menu';
import { CopyToast } from '@/components/toast';
import { ThemeNavigation } from '@/components/theme-toggle';
import './globals.css';
import './studio.css';
import './ribbon.css';
import './examples.css';
import './navigation.css';
import './blackout.css';
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
  title: { default: 'Hidn — private content drops', template: '%s · Hidn' },
  description:
    'Share and sell private photo, video, and artwork collections with one simple link.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var hidnTheme='light';try{hidnTheme=localStorage.getItem('hidn-theme')==='blackout'?'blackout':'light'}catch{}if(/^\\/d\\/[^/]+\\/?$/.test(location.pathname)||/^\\/dashboard\\/drops\\/[^/]+\\/preview\\/?$/.test(location.pathname))hidnTheme='blackout';document.documentElement.dataset.theme=hidnTheme;",
          }}
        />
      </head>
      <body>
        <Suspense fallback={null}>
          <ThemeNavigation />
        </Suspense>
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
            <Suspense fallback={null}>
              <AccountMenu />
            </Suspense>
          </nav>
        </header>
        <main>
          <PageMotion>{children}</PageMotion>
        </main>
        <CopyToast />
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
