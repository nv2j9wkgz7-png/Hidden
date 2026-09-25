import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CircleStop,
  Eye,
  Link2,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { NavigationLink as Link } from './navigation-link';
import { CreatorPortrait } from './creator-portrait';
import {
  LinkControlDemo,
  PlatformMarquee,
  SalesDashboardDemo,
  SharingShowcase,
} from './home-demos';

export function CreatorHome({ signedIn }: { signedIn: boolean }) {
  const createHref = signedIn ? '/new' : '/login?mode=signup&next=new';
  return (
    <div className="launch-home">
      <section className="launch-hero">
        <div className="launch-hero-copy">
          <div className="launch-eyebrow">
            <span /> MADE FOR YOUR SIDE OF THE INTERNET
          </div>
          <h1>
            Your content.
            <br />
            <em>Your price.</em>
          </h1>
          <p className="launch-lead">
            Turn your photos and videos into a paid link. Share it with your
            people. Keep doing you.
          </p>
          <div className="launch-actions">
            <Link className="button" href={createHref}>
              {signedIn ? 'Create a drop' : 'Create your first drop'}{' '}
              <ArrowUpRight size={17} />
            </Link>
            <Link
              className="launch-text-link"
              href={signedIn ? '/dashboard' : '/login'}
            >
              {signedIn ? 'My drops' : 'Log in'} <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="hero-points">
            <span>
              <LockKeyhole size={14} /> No public profile
            </span>
            <span>
              <Check size={14} /> No subscription to sell
            </span>
          </div>
        </div>
        <div
          className="hero-scene"
          aria-label="Illustrative creator drop and purchase notification"
        >
          <div className="hero-scene-grid" aria-hidden="true" />
          <div className="hero-social-note">
            <span className="tiny-avatar">
              <CreatorPortrait avatar priority />
            </span>
            <div>
              <strong>Maya Lane</strong>
              <small>Something just for you.</small>
            </div>
            <span className="hero-note-heart">♡</span>
          </div>
          <div className="hero-drop">
            <div className="hero-drop-photo">
              <CreatorPortrait priority />
              <div className="hero-drop-byline">
                <span>MAYA LANE</span>
                <span>
                  <Eye size={12} /> Free preview
                </span>
              </div>
              <div className="hero-photo-title">
                After
                <br />
                <em>hours.</em>
              </div>
            </div>
            <div className="hero-drop-bottom">
              <div>
                <strong>The photos after the photos.</strong>
                <span>12 photos · 48 MB</span>
              </div>
              <span className="hero-drop-price">$18</span>
            </div>
            <div className="hero-unlock">
              <LockKeyhole size={14} /> Unlock the full drop{' '}
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="hero-paid-toast">
            <span>
              <Check size={18} />
            </span>
            <div>
              <strong>You made a sale.</strong>
              <small>After hours · just now</small>
            </div>
            <b>+$18</b>
          </div>
          <span className="hero-example-note">
            Fictional creator · illustrative purchase
          </span>
        </div>
      </section>
      <PlatformMarquee />
      <section className="launch-section" id="share-anywhere">
        <div className="launch-section-heading">
          <div>
            <span className="launch-kicker">GO WHERE YOUR PEOPLE ARE</span>
            <h2>
              One link.
              <br />
              So many places.
            </h2>
          </div>
          <p>
            In a message. In your bio. Under your stream.
            <br />
            Give your audience something worth opening.
          </p>
        </div>
        <SharingShowcase />
      </section>
      <section className="launch-steps" aria-label="How Hidn works">
        {[
          [
            Eye,
            'Pick your content.',
            'Photos, videos, or a whole collection. Choose what to preview for free.',
          ],
          [
            Link2,
            'Price it. Link it.',
            'Set one price and share your private drop link.',
          ],
          [
            ArrowDownToLine,
            'They pay. It opens.',
            'Buyers unlock the originals and download. No subscription required.',
          ],
        ].map(([Icon, title, copy], i) => {
          const I = Icon as typeof Eye;
          return (
            <div key={String(title)}>
              <div className="step-icon">
                <I size={21} />
                <small>0{i + 1}</small>
              </div>
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
            </div>
          );
        })}
      </section>
      <section className="launch-analytics launch-section">
        <div className="launch-editorial-copy">
          <span className="launch-kicker">LESS GUESSING. MORE CREATING.</span>
          <h2>
            See what
            <br />
            <em>clicks.</em>
          </h2>
          <p>
            Your sales, your revenue, your best drops.
            <br />
            All in one place.
          </p>
          <div className="analytics-mini-note">
            <span>
              <Check size={15} />
            </span>
            Know what your audience comes back for.
          </div>
        </div>
        <SalesDashboardDemo />
      </section>
      <section className="launch-privacy launch-section">
        <div className="launch-editorial-copy">
          <span className="launch-kicker">PRIVATE BY DESIGN</span>
          <h2>
            Share a little.
            <br />
            Stay in control.
          </h2>
          <div className="privacy-promises">
            <div>
              <ShieldCheck size={21} />
              <div>
                <h3>No public profile needed.</h3>
                <p>You share a link, not your whole world.</p>
              </div>
            </div>
            <div>
              <Eye size={21} />
              <div>
                <h3>You choose the preview.</h3>
                <p>Everything else stays blurred until payment.</p>
              </div>
            </div>
            <div>
              <CircleStop size={21} />
              <div>
                <h3>Stop new sales in a tap.</h3>
                <p>
                  Close the link to new purchases. Paid buyers keep their
                  existing access.
                </p>
              </div>
            </div>
          </div>
        </div>
        <LinkControlDemo />
      </section>
      <section className="launch-finale">
        <img src="/hidn-arrow-mark.svg" width={76} height={76} alt="" />
        <span className="launch-kicker">SMALL DROP. YOUR NEXT BIG THING.</span>
        <h2>
          Make it.
          <br />
          Drop it.
        </h2>
        <p>
          No feed to fill. No subscription to manage.
          <br />
          Just your content, at your price.
        </p>
        <Link className="button" href={createHref}>
          Start your drop <ArrowUpRight size={18} />
        </Link>
      </section>
      <p className="launch-fine-print">
        Profiles, purchases, and figures shown are fictional examples. Platform
        logos identify sharing destinations, not partnerships. Each platform’s
        link and content rules apply.
      </p>
    </div>
  );
}
