import { NavigationLink as Link } from '@/components/navigation-link';
import {
  ArrowUpRight,
  Mail,
  ShoppingBag,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
export const metadata = { title: 'Help & FAQ' };

const questions = [
  {
    question: 'What is a drop?',
    answer: (
      <>
        A drop is a private collection of photos or videos shared through a
        link. Buyers see blurred previews, pay the listed price once, and unlock
        the original files.
      </>
    ),
  },
  {
    question: 'Do I need an account to buy?',
    answer: (
      <>
        No. You can check out as a guest and view or download your purchase for
        72 hours after payment. If you’re logged in when you buy, the purchase
        is saved automatically to <Link href="/purchases">My purchases</Link>.
      </>
    ),
  },
  {
    question: 'What happens after 72 hours?',
    answer: (
      <>
        Guest viewing and download access expires. Files you already downloaded
        or received as ZIP attachments remain yours to keep. Purchases saved to
        an account remain accessible when you log in, while the files are
        available and the purchase hasn’t been refunded.
      </>
    ),
  },
  {
    question: 'How do I recover a guest purchase?',
    answer: (
      <>
        Choose <Link href="/purchases/recover">Recover a purchase</Link> and
        enter the email you used at checkout. Open the verification email within
        30 minutes, then sign in or create an account and choose “Add purchases
        to my account.” This works after guest access expires, too. You must
        have access to that inbox; purchases saved to another account or
        refunded purchases cannot be claimed.
      </>
    ),
  },
  {
    question: 'Where can I find everything I’ve bought?',
    answer: (
      <>
        Open Account → <Link href="/purchases">My purchases</Link> to see your
        saved photos and videos together. For a guest purchase, choose “Save to
        my account” on the paid page and verify your checkout email during its
        access window, or recover it using your checkout email later.
      </>
    ),
  },
  {
    question: 'Can I download everything or email myself a ZIP?',
    answer: (
      <>
        Yes. On the unlocked purchase page, download individual files or choose
        “Download all” for a ZIP. You can also request a ZIP at your checkout
        email address. ZIPs up to 15 MB are attached; larger collections receive
        a download link. Guest download links keep the original 72-hour
        deadline; saved purchases require login. Purchase files are only emailed
        when you ask.
      </>
    ),
  },
  {
    question: 'Can someone else use my purchase link?',
    answer: (
      <>
        A forwarded link alone won’t unlock your purchase in a new browser. We
        require a one-time code sent to the original checkout email. Don’t share
        your codes. Guest access still ends 72 hours after payment; saved
        purchases require the account that owns them. Downloaded files and ZIP
        attachments can still be shared by whoever has them.
      </>
    ),
  },
  {
    question: 'What can I upload to a drop?',
    answer: (
      <>
        You can upload JPEG, PNG, or WebP images up to 10 MB each, and MP4, MOV,
        or WebM videos up to 50 MB each. A drop can contain up to 20 files and
        200 MB in total. Choosing a folder adds supported files from that folder
        and its subfolders to one drop.
      </>
    ),
  },
  {
    question: 'Can I preview and reorder my files?',
    answer: (
      <>
        Yes. Tap a thumbnail to view the photo or play the video. Grab a file’s
        grip to move it into place. The first file is your cover, and the order
        saves when you review your drop.
      </>
    ),
  },
  {
    question: 'Why are the originals still locked after payment?',
    answer: (
      <>
        The page unlocks after payment is confirmed. If it’s still awaiting
        confirmation, use “Check payment again” or refresh shortly; don’t pay
        again. If you’re in another browser or device,{' '}
        <Link href="/purchases">log in to your saved purchases</Link> or{' '}
        <Link href="/purchases/recover">
          recover the purchase using your checkout email
        </Link>
        .
      </>
    ),
  },
];

const groups = [
  {
    id: 'buying',
    title: 'Buying a drop',
    note: 'From the first click to the originals.',
    icon: ShoppingBag,
    items: [0, 1, 9],
  },
  {
    id: 'access',
    title: 'Your purchases & access',
    note: 'Find, save, and return to what’s yours.',
    icon: LockKeyhole,
    items: [2, 3, 4, 5, 6],
  },
  {
    id: 'creating',
    title: 'Creating & sharing',
    note: 'Get your next drop ready to go.',
    icon: Sparkles,
    items: [7, 8],
  },
];
export default function Help() {
  return (
    <section className="help-page utility-page">
      <header className="utility-heading">
        <div>
          <div className="eyebrow">A little help</div>
          <h1>
            Help, without the hassle<span className="heading-dot">.</span>
          </h1>
          <p>Quick answers. A way back to your purchases.</p>
        </div>
      </header>
      <Link
        href="/purchases/recover"
        className="help-recovery-card utility-surface"
      >
        <span className="utility-icon">
          <Mail size={25} />
        </span>
        <div>
          <h2>Looking for a purchase?</h2>
          <p>Find it with your checkout email—even after guest access ends.</p>
        </div>
        <span className="help-recovery-action">
          Recover a purchase <ArrowUpRight size={20} />
        </span>
      </Link>
      <section
        id="faq"
        className="help-faq utility-faq"
        aria-labelledby="faq-heading"
      >
        <div className="utility-section-heading">
          <h2 id="faq-heading">Frequently asked questions</h2>
        </div>
        <div className="help-directory">
          <nav className="help-topics" aria-label="Help topics">
            {groups.map(({ id, title, icon: Icon }) => (
              <Link key={id} href={`#${id}`}>
                <Icon size={17} />
                {title}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
          <div className="help-groups">
            {groups.map(({ id, title, note, items, icon: Icon }) => (
              <section
                id={id}
                key={id}
                className="help-group"
                aria-labelledby={`${id}-heading`}
              >
                <div className="help-group-heading">
                  <Icon size={21} />
                  <div>
                    <h3 id={`${id}-heading`}>{title}</h3>
                    <p>{note}</p>
                  </div>
                </div>
                {items.map((index) => (
                  <details key={questions[index].question} name={id}>
                    <summary>{questions[index].question}</summary>
                    <div className="help-answer">
                      <p>{questions[index].answer}</p>
                    </div>
                  </details>
                ))}
              </section>
            ))}
          </div>
        </div>
      </section>
      <div className="help-bottom-note">
        <LockKeyhole size={18} />
        <p>
          Keep your access links and verification codes private. Your saved
          purchases belong in your account.
        </p>
      </div>
    </section>
  );
}
