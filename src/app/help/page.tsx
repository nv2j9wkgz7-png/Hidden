import { NavigationLink as Link } from '@/components/navigation-link';
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
        my account” on the paid page during its access window, or recover it
        using your checkout email later.
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
        Anyone with a private guest access link can use it until its 72-hour
        deadline, so keep it private. After that, the link alone won’t unlock
        the files. Ongoing access to a saved purchase requires the account that
        owns it.
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

export default function Help() {
  return (
    <section className="help-page">
      <div className="eyebrow">A little help</div>
      <h1>Help & answers.</h1>
      <p className="help-intro">
        For your drops, downloads, and everything you’ve saved.
      </p>
      <div className="help-recovery">
        <div>
          <h2>Looking for a purchase?</h2>
          <p>
            Use your checkout email to find it again—even after guest access
            ends.
          </p>
        </div>
        <Link className="secondary" href="/purchases/recover">
          Recover a purchase ↗
        </Link>
      </div>
      <section id="faq" aria-labelledby="faq-heading" className="help-faq">
        <h2 id="faq-heading">Frequently asked questions</h2>
        {questions.map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <div className="help-answer">
              <p>{answer}</p>
            </div>
          </details>
        ))}
      </section>
    </section>
  );
}
