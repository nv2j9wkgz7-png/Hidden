import Link from 'next/link';
import { ArrowUpRight, LockKeyhole, Images } from 'lucide-react';
export default function Home() {
  return (
    <div className="home">
      <section>
        <div className="eyebrow">
          <span>Made to share. Yours to sell.</span>
        </div>
        <h1>
          Your images.
          <br />
          One link.
          <br />
          <em>Paid & delivered.</em>
        </h1>
        <p className="lead">
          Turn a collection of images into a paid drop. Share the link, and let
          the unlock do the rest.
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
      <section className="flow" aria-label="How drops work">
        <div className="flow-top">
          <strong style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Images size={20} /> A simpler handoff
          </strong>
          <span className="badge">3 steps</span>
        </div>
        {[
          ['Upload your images', 'One image or a whole collection.'],
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
    </div>
  );
}
