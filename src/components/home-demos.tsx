'use client';

import { useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  CircleStop,
  Link2,
  LockKeyhole,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Video,
} from 'lucide-react';
import { CreatorPortrait } from './creator-portrait';

const platforms = ['instagram', 'x', 'kick', 'twitch', 'youtube'];
export function PlatformLogo({ name }: { name: string }) {
  return (
    <img
      className={`platform-logo platform-${name}`}
      src={`/platforms/${name}.svg`}
      width={32}
      height={32}
      alt={
        name === 'x'
          ? 'X'
          : name === 'youtube'
            ? 'YouTube'
            : name[0].toUpperCase() + name.slice(1)
      }
    />
  );
}

export function PlatformMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div
      className="platform-marquee"
      aria-label="Share your links on Instagram, X, Kick, Twitch and YouTube"
    >
      <div className="platform-window">
        <div className={`platform-track ${paused ? 'is-paused' : ''}`}>
          {[0, 1, 2].map((copy) => (
            <div
              className="platform-set"
              key={copy}
              aria-hidden={copy > 0 ? true : undefined}
            >
              {platforms.map((name) => (
                <span key={name}>
                  <PlatformLogo name={name} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button
        className="marquee-pause"
        onClick={() => setPaused(!paused)}
        aria-label={paused ? 'Play platform logos' : 'Pause platform logos'}
        aria-pressed={paused}
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
      </button>
    </div>
  );
}

function WatermarkedPhoto({
  person = 'maya',
}: {
  person?: 'maya' | 'jay' | 'nina';
}) {
  return (
    <div className="sample-locked-photo">
      <CreatorPortrait person={person} />
      <img
        src="/hidn-arrow-mark.svg"
        className="sample-watermark"
        width={54}
        height={54}
        alt="Hidn protected preview"
      />
    </div>
  );
}

function MessageExample() {
  return (
    <div
      className="social-mock message-mock"
      aria-label="Example iMessage conversation with Maya Lane"
    >
      <div className="message-top">
        <ChevronLeft size={21} />
        <div>
          <CreatorPortrait avatar priority />
          <strong>
            Maya Lane <span>›</span>
          </strong>
        </div>
        <Video size={20} />
      </div>
      <div className="message-conversation">
        <small>Today 9:41 AM</small>
        <p className="chat-incoming">Wait, where can I get the full set?</p>
        <p className="chat-outgoing">Right here. My after-hours edit ♡</p>
        <div className="message-link-card">
          <WatermarkedPhoto />
          <div className="sample-preview-count">
            1 free preview <span>✧</span>
          </div>
          <div className="message-link-copy">
            <strong>After hours, by Maya</strong>
            <span>12 photos · $18 USD</span>
            <small>sendhidn.com</small>
          </div>
        </div>
        <span className="message-delivered">Delivered</span>
      </div>
      <div className="message-input" aria-hidden="true">
        <Plus size={18} />
        <span>iMessage</span>
        <Send size={15} />
      </div>
    </div>
  );
}

function XExample() {
  return (
    <div
      className="social-mock x-mock"
      aria-label="Example X profile for fictional music creator Nina Park"
    >
      <div className="social-top">
        <ArrowLeft size={18} />
        <strong>Nina Park</strong>
        <PlatformLogo name="x" />
      </div>
      <div className="x-banner">
        <span>AFTER THE ENCORE.</span>
        <i aria-hidden="true" />
      </div>
      <div className="x-profile-body">
        <div className="x-avatar-line">
          <CreatorPortrait person="nina" avatar priority />
          <span className="mock-follow">Follow</span>
        </div>
        <strong className="profile-name">
          Nina Park{' '}
          <span className="profile-check">
            <Check size={10} />
          </span>
        </strong>
        <small className="profile-handle">@ninaparkmusic</small>
        <p>
          Making music. Making a little noise.
          <br />
          Backstage photos + unreleased clips ↓
        </p>
        <div className="profile-hidn-link">
          <Link2 size={14} />
          <span>sendhidn.com/d/nina</span>
          <ArrowUpRight size={14} />
        </div>
        <div className="x-followers">
          <span>
            <b>218</b> Following
          </span>
          <span>
            <b>24.8K</b> Followers
          </span>
        </div>
      </div>
      <div className="x-tabs">
        <strong>Posts</strong>
        <span>Replies</span>
        <span>Media</span>
      </div>
      <div className="x-post">
        <CreatorPortrait person="nina" avatar />
        <div>
          <strong>
            Nina Park <small>@ninaparkmusic · 2h</small>
          </strong>
          <p>
            The moments between the songs.
            <br />
            New backstage drop is up.
          </p>
          <div className="x-post-media">
            <WatermarkedPhoto person="nina" />
            <span>
              <LockKeyhole size={12} /> Backstage, vol. 02
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KickExample() {
  return (
    <div
      className="social-mock kick-mock"
      aria-label="Example Kick streamer profile for fictional creator JayLive"
    >
      <div className="social-top">
        <PlatformLogo name="kick" />
        <strong>JAYLIVE</strong>
        <MoreHorizontal size={20} />
      </div>
      <div className="kick-stream">
        <CreatorPortrait person="jay" priority />
        <span className="kick-live">LIVE</span>
        <div className="stream-overlay">
          <span>THE LATE LOBBY</span>
          <small>Just chatting · 1.2K watching</small>
        </div>
      </div>
      <div className="kick-profile">
        <CreatorPortrait person="jay" avatar />
        <div>
          <strong>
            JayLive <Check size={12} />
          </strong>
          <small>Good games. Better company.</small>
        </div>
        <span className="kick-follow">+ Follow</span>
      </div>
      <div className="kick-tabs">
        <strong>About</strong>
        <span>Videos</span>
        <span>Clips</span>
      </div>
      <div className="kick-about">
        <strong>Off stream. Still here.</strong>
        <p>
          Extra clips, behind the scenes, and the photos that don’t make the
          feed.
        </p>
        <div className="kick-link">
          <img src="/hidn-arrow-mark.svg" alt="" width={30} height={30} />
          <div>
            <strong>My latest drop</strong>
            <small>sendhidn.com/d/jay</small>
          </div>
          <ArrowUpRight size={16} />
        </div>
      </div>
    </div>
  );
}

function SharingPlatformLabel({ index }: { index: number }) {
  if (index === 0) return <>iMessage</>;
  const platform = index === 1 ? 'x' : 'kick';
  return (
    <span
      className="sharing-platform-icon"
      role="img"
      aria-label={index === 1 ? 'X' : 'Kick'}
    >
      <span className={`sharing-platform-mark platform-mark-${platform}`} />
    </span>
  );
}

export function SharingShowcase() {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const id = useId();
  const names = ['iMessage', 'X bio', 'Kick bio'];
  function go(index: number) {
    const element = rail.current;
    const card = element?.children[index] as HTMLElement | undefined;
    if (!element || !card) return;
    element.scrollTo({
      left: card.offsetLeft,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
    setActive(index);
  }
  return (
    <div className="sharing-showcase">
      <div
        className="sharing-mobile-tabs"
        role="group"
        aria-label="Sharing examples"
      >
        {names.map((name, i) => (
          <button
            key={name}
            aria-label={name}
            aria-pressed={active === i}
            aria-controls={id}
            onClick={() => go(i)}
          >
            <SharingPlatformLabel index={i} />
          </button>
        ))}
      </div>
      <div
        className="sharing-rail"
        id={id}
        ref={rail}
        onScroll={() => {
          const element = rail.current;
          if (!element) return;
          const cards = Array.from(element.children) as HTMLElement[];
          const index = cards.reduce(
            (best, card, i) =>
              Math.abs(card.offsetLeft - element.scrollLeft) <
              Math.abs(cards[best].offsetLeft - element.scrollLeft)
                ? i
                : best,
            0,
          );
          setActive(index);
        }}
      >
        {[
          <MessageExample key="message" />,
          <XExample key="x" />,
          <KickExample key="kick" />,
        ].map((demo, i) => (
          <div className="sharing-slide" key={names[i]}>
            <div className="sharing-card-label">
              <span>0{i + 1}</span>
              <SharingPlatformLabel index={i} />
            </div>
            {demo}
          </div>
        ))}
      </div>
      <p className="demo-caption">
        Fictional creators. Real ways to share. Link previews vary by app.
      </p>
    </div>
  );
}

const demoPeriods = {
  7: {
    revenue: 1284,
    sales: 68,
    values: [90, 132, 126, 204, 186, 240, 306],
    rows: [28, 20, 20],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  30: {
    revenue: 4872,
    sales: 258,
    values: [360, 504, 612, 720, 744, 876, 1056],
    rows: [94, 80, 84],
    labels: ['Sep 1', '', 'Sep 10', '', 'Sep 20', '', 'Sep 30'],
  },
};
export function SalesDashboardDemo() {
  const [period, setPeriod] = useState<7 | 30>(7);
  const data = demoPeriods[period];
  const chartId = useId().replace(/:/g, '');
  const max = Math.max(...data.values) * 1.15;
  const points = data.values
    .map((n, i) => `${i * 80},${150 - (n / max) * 130}`)
    .join(' ');
  return (
    <div
      className="sales-demo"
      aria-label="Illustrative creator sales dashboard"
    >
      <header className="sales-demo-header">
        <div>
          <img src="/hidn-arrow-mark.svg" width={26} height={26} alt="" />
          <strong>Your studio</strong>
        </div>
        <span>DEMO DATA</span>
      </header>
      <div className="sales-demo-title">
        <div>
          <small>Overview</small>
          <h3>Your content is working.</h3>
        </div>
        <div
          className="sales-periods"
          role="group"
          aria-label="Demo sales period"
        >
          {([7, 30] as const).map((n) => (
            <button
              key={n}
              aria-pressed={period === n}
              onClick={() => setPeriod(n)}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>
      <div className="sales-demo-metrics" aria-live="polite">
        <div>
          <span>Gross revenue</span>
          <strong>${data.revenue.toLocaleString('en-US')}</strong>
        </div>
        <div>
          <span>Sales</span>
          <strong>{data.sales}</strong>
        </div>
        <div>
          <span>Avg. order</span>
          <strong>${(data.revenue / data.sales).toFixed(2)}</strong>
        </div>
      </div>
      <div className="sales-demo-chart">
        <div className="chart-grid" aria-hidden="true">
          <span>$ {Math.round(max)}</span>
          <span>$ {Math.round(max / 2)}</span>
          <span>$ 0</span>
        </div>
        <svg
          viewBox="0 0 480 165"
          role="img"
          aria-label={`Illustrative revenue chart: $${data.revenue} over ${period} days`}
          preserveAspectRatio="none"
          key={period}
        >
          <defs>
            <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c687ce" stopOpacity=".35" />
              <stop offset="100%" stopColor="#c687ce" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`0,165 ${points} 480,165`}
            fill={`url(#${chartId})`}
          />
          <polyline
            points={points}
            pathLength="1"
            fill="none"
            stroke="#b879cb"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="chart-days" aria-hidden="true">
        {data.labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="sales-table">
        <div className="sales-table-heading">
          <strong>Your top drops</strong>
          <span>Sales / revenue</span>
        </div>
        {[
          ['maya', 'After hours', 18],
          ['jay', 'Off the record', 24],
          ['nina', 'Backstage, vol. 02', 15],
        ].map(([person, title, price], i) => (
          <div className="sales-table-row" key={title}>
            <CreatorPortrait person={person as 'maya' | 'jay' | 'nina'} />
            <div>
              <strong>{title}</strong>
              <small>{data.rows[i]} sales</small>
            </div>
            <b>${(data.rows[i] * Number(price)).toLocaleString('en-US')}</b>
          </div>
        ))}
      </div>
      <p className="sales-demo-footnote">
        Illustrative sales in USD, before fees and refunds.
      </p>
    </div>
  );
}

export function LinkControlDemo() {
  const [stopped, setStopped] = useState(false);
  return (
    <div className={`link-control-demo ${stopped ? 'is-stopped' : ''}`}>
      <div className="control-demo-top">
        <span>TRY THE CONTROL</span>
        <ShieldCheck size={19} />
      </div>
      <div className="control-drop">
        <CreatorPortrait />
        <div>
          <strong>After hours</strong>
          <span>sendhidn.com/d/maya</span>
        </div>
        <span
          className={`control-status ${stopped ? '' : 'is-live'}`}
          aria-live="polite"
        >
          {stopped ? 'Stopped' : 'Live'}
        </span>
      </div>
      <div className="control-link-state">
        <div className="control-link-icon">
          {stopped ? <LockKeyhole size={30} /> : <Link2 size={30} />}
        </div>
        <strong aria-live="polite">
          {stopped ? 'New sales are off.' : 'Your link. Your call.'}
        </strong>
        <p>
          {stopped
            ? 'Paid buyers keep their existing access.'
            : 'Close new purchases whenever you want.'}
        </p>
      </div>
      <button
        className={stopped ? 'secondary control-reset' : 'demo-stop-button'}
        onClick={() => setStopped(!stopped)}
      >
        {stopped ? (
          <>
            <Play size={15} /> Replay demo
          </>
        ) : (
          <>
            <CircleStop size={17} /> Stop sales
          </>
        )}
      </button>
      <small className="control-disclaimer">
        Interactive example · no real link is changed
      </small>
    </div>
  );
}
