'use client';

import {
  Children,
  useEffect,
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

  function syncPosition() {
    const rail = track.current;
    if (!rail) return;
    const cards = Array.from(rail.children) as HTMLElement[];
    const left = rail.getBoundingClientRect().left;
    let nearest = 0;
    cards.forEach((card, index) => {
      if (
        Math.abs(card.getBoundingClientRect().left - left) <
        Math.abs(cards[nearest].getBoundingClientRect().left - left)
      )
        nearest = index;
    });
    setActive(nearest);
    if (cards[nearest])
      setHeight(Math.ceil(cards[nearest].getBoundingClientRect().height) + 2);
  }

  useEffect(() => {
    const rail = track.current;
    if (!rail) return;
    const query = window.matchMedia('(max-width: 600px)');
    const update = () => {
      setMobile(query.matches);
      syncPosition();
    };
    update();
    query.addEventListener('change', update);
    const observer = new ResizeObserver(syncPosition);
    Array.from(rail.children).forEach((card) => observer.observe(card));
    return () => {
      query.removeEventListener('change', update);
      observer.disconnect();
    };
  }, []);

  function goTo(index: number) {
    const rail = track.current;
    const card = rail?.children[index] as HTMLElement | undefined;
    if (!rail || !card) return;
    rail.scrollTo({
      left:
        rail.scrollLeft +
        card.getBoundingClientRect().left -
        rail.getBoundingClientRect().left,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  return (
    <section
      className="guide-gallery"
      aria-label="How to use Hidn, four steps"
      aria-roledescription={mobile ? 'carousel' : undefined}
    >
      <div className="guide-gallery-heading" aria-hidden="true">
        <span>Swipe to explore</span>
        <span>
          {active + 1} / {count}
        </span>
      </div>
      <ol
        id="guide-gallery-track"
        className="howto-steps"
        ref={track}
        tabIndex={mobile ? 0 : undefined}
        aria-label="Guide steps"
        style={
          height
            ? ({ '--guide-slide-height': `${height}px` } as CSSProperties)
            : undefined
        }
        onScroll={syncPosition}
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
