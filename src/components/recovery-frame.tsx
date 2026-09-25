import type { ReactNode } from 'react';
import { ArrowLeft, LockKeyhole, Mail, Images } from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
import { CollectionArtwork } from './utility-art';
export function RecoveryFrame({ children }: { children: ReactNode }) {
  return (
    <section className="utility-page purchase-recovery-page">
      <Link restoreScroll className="utility-back" href="/help">
        <ArrowLeft size={16} /> Back to Help
      </Link>
      <div className="purchase-recovery-layout">
        {children}
        <aside className="recovery-story">
          <CollectionArtwork />
          <div className="eyebrow">Still yours</div>
          <h2>
            Your purchases.
            <br />
            Back where they belong.
          </h2>
          <ol className="recovery-story-steps">
            <li>
              <Mail size={18} />
              <span>Verify the email you used at checkout.</span>
            </li>
            <li>
              <Images size={18} />
              <span>
                Save eligible purchases to the Hidn account you choose.
              </span>
            </li>
          </ol>
          <p className="utility-privacy">
            <LockKeyhole size={16} /> Your library stays private.
          </p>
        </aside>
      </div>
    </section>
  );
}
