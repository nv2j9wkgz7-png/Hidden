'use client';

import {
  Children,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function GuideGallery({ children }: { children: ReactNode }) {
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [height, setHeight] = useState<number>();
  const count = Children.count(children);

  useLayoutEffect(() => {
    const rail = track.current;
    if (!rail) return;
    const cards = Array.from(rail.children) as HTMLElement[];
    const query = window.matchMedia('(max-width: 600px)');
    let current = 0;
    let touching = false;
    let scrolling = false;
    let width = rail.clientWidth;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const targetLeft = (index: number) =>
      cards[index].offsetLeft - cards[0].offsetLeft;
    const nearest = () =>
      cards.reduce(
        (best, _, index) =>
          Math.abs(targetLeft(index) - rail.scrollLeft) <
          Math.abs(targetLeft(best) - rail.scrollLeft)
            ? index
            : best,
        0,
      );
    const measure = () => {
      if (cards[current])
        setHeight(Math.ceil(cards[current].getBoundingClientRect().height));
    };
    const measureVisible = () => {
      // Resize the outer viewport, not the scrolling rail. Keeping the rail's
      // geometry stable lets Safari finish snapping while taller cards appear.
      const left = Math.max(0, rail.scrollLeft);
      const next = cards.findIndex((_, index) => targetLeft(index) > left);
      const from = next < 0 ? cards.length - 1 : Math.max(0, next - 1);
      const to = next < 0 ? from : next;
      if (!cards[from]) return;
      const distance = targetLeft(to) - targetLeft(from);
      const progress = distance
        ? Math.min(1, (left - targetLeft(from)) / distance)
        : 0;
      const start = cards[from].getBoundingClientRect().height;
      const end = cards[to].getBoundingClientRect().height;
      setHeight(Math.ceil(start + (end - start) * progress));
    };
    const settle = () => {
      if (!query.matches || touching || !cards.length) return;
      clearTimeout(settleTimer);
      scrolling = false;
      current = nearest();
      const left = targetLeft(current);
      // Safari can leave a mandatory snap unfinished after touch momentum.
      // Correct the resting position without changing the scrolling rail size.
      if (Math.abs(rail.scrollLeft - left) > 0.5)
        rail.scrollTo({ left, behavior: 'instant' });
      setActive(current);
      measure();
    };
    const queueSettle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 180);
    };
    const onScroll = () => {
      if (!query.matches || !cards.length) return;
      scrolling = true;
      current = nearest();
      setActive(current);
      measureVisible();
      queueSettle();
    };
    const onTouchStart = () => {
      touching = true;
      clearTimeout(settleTimer);
    };
    const onTouchEnd = () => {
      touching = false;
      queueSettle();
    };
    const update = () => {
      setMobile(query.matches);
      const resized = rail.clientWidth !== width;
      width = rail.clientWidth;
      if (query.matches && resized && cards.length) {
        rail.scrollTo({ left: targetLeft(current), behavior: 'instant' });
      }
      if (!touching && !scrolling) measure();
    };
    update();
    query.addEventListener('change', update);
    rail.addEventListener('scroll', onScroll, { passive: true });
    rail.addEventListener('scrollend', settle);
    rail.addEventListener('touchstart', onTouchStart, { passive: true });
    rail.addEventListener('touchend', onTouchEnd, { passive: true });
    rail.addEventListener('touchcancel', onTouchEnd, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    cards.forEach((card) => observer.observe(card));
    return () => {
      clearTimeout(settleTimer);
      query.removeEventListener('change', update);
      rail.removeEventListener('scroll', onScroll);
      rail.removeEventListener('scrollend', settle);
      rail.removeEventListener('touchstart', onTouchStart);
      rail.removeEventListener('touchend', onTouchEnd);
      rail.removeEventListener('touchcancel', onTouchEnd);
      observer.disconnect();
    };
  }, []);

  function goTo(index: number) {
    const rail = track.current;
    const card = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !card) return;
    rail.scrollTo({
      left: card.offsetLeft - (rail.children[0] as HTMLElement).offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  return (
    <section
      className="guide-gallery"
      data-ready={height !== undefined ? 'true' : undefined}
      aria-label="How to use Hidn, four steps"
      aria-roledescription={mobile ? 'carousel' : undefined}
    >
      <div className="guide-gallery-heading" aria-hidden="true">
        <span>Swipe to explore</span>
        <span>
          {active + 1} / {count}
        </span>
      </div>
      <div
        className="guide-gallery-viewport"
        style={
          height
            ? ({ '--guide-slide-height': `${height}px` } as CSSProperties)
            : undefined
        }
      >
        <ol
          id="guide-gallery-track"
          className="howto-steps"
          ref={track}
          tabIndex={mobile ? 0 : undefined}
          aria-label="Guide steps"
          onKeyDown={(event) => {
            if (!mobile || event.target !== event.currentTarget) return;
            const index =
              event.key === 'ArrowRight'
                ? Math.min(count - 1, active + 1)
                : event.key === 'ArrowLeft'
                  ? Math.max(0, active - 1)
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? count - 1
                      : null;
            if (index === null) return;
            event.preventDefault();
            goTo(index);
          }}
        >
          {children}
        </ol>
      </div>
      <nav
        className="guide-gallery-controls"
        aria-label="Guide gallery controls"
      >
        <button
          type="button"
          aria-label="Previous step"
          aria-controls="guide-gallery-track"
          disabled={active === 0}
          onClick={() => goTo(active - 1)}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="guide-gallery-dots">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to step ${index + 1}`}
              aria-current={active === index ? 'step' : undefined}
              aria-controls="guide-gallery-track"
              onClick={() => goTo(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next step"
          aria-controls="guide-gallery-track"
          disabled={active === count - 1}
          onClick={() => goTo(active + 1)}
        >
          <ArrowRight size={18} />
        </button>
        <span className="guide-gallery-announcement" role="status">
          Step {active + 1} of {count}
        </span>
      </nav>
    </section>
  );
}
