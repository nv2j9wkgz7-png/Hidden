import { NavigationLink as Link } from '@/components/navigation-link';
import { ArrowUpRight, LockKeyhole, Images } from 'lucide-react';
import { configured } from '@/lib/env';
import { supabase } from '@/lib/supabase/server';
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
            <Link href="/new" className="button">
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
    <div className="howto-page">
      <div className="guide-intro">
        <img src="/hidn-arrow-mark.svg" alt="" width={92} height={92} />
        <div className="eyebrow">A quick guide</div>
        <h1>How to use Hidn</h1>
        <p className="lead">From your content to their inbox in a few steps.</p>
      </div>
      <ol className="howto-steps">
        {[
          [
            'Upload your photos and videos',
            'Go to My drops and select the + card. Add the files you want to sell together.',
          ],
          [
            'Add a title and price',
            'Name your drop, set a price in USD, and publish. One payment unlocks the whole collection.',
          ],
          [
            'Share your link',
            'Copy the link or choose a sharing app. Recipients see blurred previews, the file count, file size, and price.',
          ],
          [
            'Your buyer pays and downloads',
            'No Hidn account needed. Once payment is confirmed, they can download the originals individually or as a ZIP. They can save their private access link to return later.',
          ],
        ].map(([title, detail], i) => (
          <li key={title}>
            <span className="step-number" aria-hidden="true">
              0{i + 1}
            </span>
            <div>
              <h2>{title}</h2>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="howto-tip">
        <strong>Want to stop selling?</strong> Open your drop and select Stop
        sales. New purchases stop; buyers who already paid keep access.
      </p>
      <Link href="/dashboard" className="button">
        Go to my drops <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
