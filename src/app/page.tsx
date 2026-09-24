import { NavigationLink as Link } from '@/components/navigation-link';
import { ArrowUpRight, LockKeyhole, Images } from 'lucide-react';
import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
import { GuideGallery } from '@/components/guide-gallery';
import { GuideVisual } from '@/components/guide-visual';
import { ExampleDrops } from '@/components/example-drops';

export default async function Home() {
  if (configured()) {
    const {
      data: { user },
    } = await (await supabase()).auth.getUser();
    if (user) return <HowToGuide />;
  }
  return (
    <div className="brand-home">
      <div className="home">
        <section>
          <div className="eyebrow">
            <span>Private sharing. Simple selling.</span>
          </div>
          <h1>
            Your content.
            <br />
            <em>Your price.</em>
          </h1>
          <p className="lead">
            Turn your photos, videos, and artwork into a private drop. Set a
            price, share a link, and sell directly to your audience.
          </p>
          <div className="actions">
            <Link href="/login?mode=signup&next=new" className="button">
              Create your first drop <ArrowUpRight size={17} />
            </Link>
            <Link href="/login" className="button secondary">
              Log in
            </Link>
          </div>
          <p className="home-note">
            <LockKeyhole size={14} /> Originals stay private until payment is
            confirmed.
          </p>
        </section>
        <ExampleDrops />
      </div>
      <section className="brand-process" aria-label="How drops work">
        <div className="flow-top">
          <strong style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Images size={20} /> Your work. One link. Ready to sell.
          </strong>
          <span className="badge">3 steps</span>
        </div>
        {[
          [
            'Add your content',
            'Photos, videos, artwork, or a mixed collection.',
          ],
          ['Set a price. Share a link.', 'Your drop, ready for your buyer.'],
          [
            'Get paid. Originals unlock.',
            'Full-resolution downloads after payment.',
          ],
        ].map(([title, detail], i) => (
          <div className="step" key={title}>
            <span className="step-number">0{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </section>
      <div className="brand-promise">
        <span>Yours to create.</span>
        <span>Yours to price.</span>
        <span>Theirs to keep.</span>
      </div>
    </div>
  );
}

function HowToGuide() {
  return (
    <div className="howto-page utility-page visual-guide">
      <div className="guide-intro">
        <img src="/hidn-arrow-mark.svg" alt="" width={92} height={92} />
        <div className="eyebrow">A quick guide</div>
        <h1>How to use Hidn</h1>
        <p className="lead">
          Your content. A simple link. Their next favorite collection.
        </p>
      </div>
      <GuideGallery>
        {[
          [
            'Gather your files',
            'Add photos and videos. Drag to reorder them and choose your cover.',
          ],
          [
            'Make it a drop',
            'Add a title, description, and price in USD. Buyers can see the file count and total size.',
          ],
          [
            'Share your link',
            'Put your link in your bio or send it in a message. Link previews keep the originals blurred.',
          ],
          [
            'Paid. Unlocked. Theirs.',
            'After payment, buyers can view the originals and download a ZIP. No account required.',
          ],
        ].map(([title, detail], i) => (
          <li key={title}>
            <GuideVisual step={i} />
            <div className="guide-step-copy">
              <span className="step-number" aria-hidden="true">
                0{i + 1}
              </span>
              <div>
                <h2>{title}</h2>
                <p>{detail}</p>
              </div>
            </div>
          </li>
        ))}
      </GuideGallery>
      <aside className="guide-stop-note">
        <span
          className="stop-sales-preview"
          role="img"
          aria-label="Example of the Stop sales button"
        >
          Stop sales
        </span>
        <div>
          <strong>Done selling this drop?</strong>
          <p>
            Open your drop and select this button. New sales stop; paid buyers
            keep their existing access.
          </p>
        </div>
      </aside>
      <Link href="/dashboard" className="button">
        Go to my drops <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
