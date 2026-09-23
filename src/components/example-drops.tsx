'use client';

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';

const examples = [
  {
    title: 'Postcards from the coast',
    category: 'Travel photography',
    description: 'Sunlit coves, slow mornings, and a different point of view.',
    image: '/examples/coast.webp',
    alt: 'Blurred preview of a turquoise sea and sunlit coastal cliffs',
    files: '12 photos · JPG',
    price: '$18',
  },
  {
    title: 'Objects in afternoon light',
    category: 'Studio collection',
    description: 'Warm tones and handmade details for your next moodboard.',
    image: '/examples/studio.webp',
    alt: 'Blurred preview of ceramics in a warm, sunlit studio',
    files: '8 photos · JPG',
    price: '$24',
  },
  {
    title: 'A little room to bloom',
    category: 'Digital artwork',
    description: 'An original botanical series, ready to download and print.',
    image: '/examples/botanical.webp',
    alt: 'Blurred preview of watercolor flowers on textured ivory paper',
    files: '6 artworks · PNG',
    price: '$12',
  },
];

export function ExampleDrops() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

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
      className="example-drops"
      aria-label="Example drops"
      aria-roledescription="carousel"
    >
      <div className="example-heading">
        <span>Small collections. Real possibilities.</span>
        <span className="example-label">Example drops</span>
      </div>
      <div
        className="example-track"
        ref={track}
        tabIndex={0}
        role="group"
        aria-label="Sample collections. Swipe, scroll, or use the arrow keys to browse."
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          goTo(
            Math.max(
              0,
              Math.min(
                examples.length - 1,
                active + (event.key === 'ArrowRight' ? 1 : -1),
              ),
            ),
          );
        }}
        onScroll={() => {
          const rail = track.current;
          if (!rail) return;
          const left = rail.getBoundingClientRect().left;
          let nearest = 0;
          Array.from(rail.children).forEach((card, index, cards) => {
            if (
              Math.abs(card.getBoundingClientRect().left - left) <
              Math.abs(cards[nearest].getBoundingClientRect().left - left)
            )
              nearest = index;
          });
          setActive(nearest);
        }}
      >
        {examples.map((example, index) => (
          <article
            className="example-card"
            key={example.title}
            aria-label={`${index + 1} of ${examples.length}: ${example.title}`}
          >
            <div className="example-sheet">
              <div className="example-image">
                <img
                  src={example.image}
                  alt={example.alt}
                  width={600}
                  height={400}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <span className="example-category">{example.category}</span>
                <div className="example-lock">
                  <span>
                    <LockKeyhole size={22} aria-hidden="true" />
                  </span>
                  <strong>A preview for now.</strong>
                  <small>Originals unlock after payment.</small>
                </div>
                <span className="example-files">{example.files}</span>
              </div>
              <div className="example-details">
                <h2>{example.title}</h2>
                <p>{example.description}</p>
                <div className="example-price-row">
                  <span>
                    Full collection <small>One-time payment</small>
                  </span>
                  <strong>
                    {example.price} <small>USD</small>
                  </strong>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="example-navigation">
        <span>
          Scroll to explore{' '}
          <span aria-live="polite">
            {active + 1} / {examples.length}
          </span>
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous example"
            disabled={active === 0}
            onClick={() => goTo(active - 1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next example"
            disabled={active === examples.length - 1}
            onClick={() => goTo(active + 1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <p className="example-disclaimer">
        Illustrative collections and prices. Nothing here is for sale.
      </p>
    </section>
  );
}
