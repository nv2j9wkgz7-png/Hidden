'use client';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole } from 'lucide-react';
import { FreePreview } from './free-preview';
import { fileSize } from '@/lib/format';
type Asset = {
  id: string;
  preview_url: string;
  is_public_preview?: boolean;
  original_filename: string;
  size_bytes: number;
  mime_type?: string;
};
export function BuyerPreviewGallery({ assets }: { assets: Asset[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  function move(index: number) {
    const el = track.current;
    if (!el) return;
    const card = el.children[index] as HTMLElement | undefined;
    if (card)
      el.scrollTo({
        left: card.offsetLeft,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  }
  return (
    <section className="buyer-media" aria-label="Collection previews">
      <div
        className="buyer-preview-track"
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const index = Array.from(el.children).reduce(
            (best, child, i) =>
              Math.abs((child as HTMLElement).offsetLeft - el.scrollLeft) <
              Math.abs(
                (el.children[best] as HTMLElement).offsetLeft - el.scrollLeft,
              )
                ? i
                : best,
            0,
          );
          setSelected(index);
        }}
      >
        {assets.map((asset, index) => (
          <div
            className="buyer-preview-slide"
            key={asset.id}
            role="group"
            aria-label={`File ${index + 1} of ${assets.length}`}
          >
            {asset.is_public_preview ? (
              <FreePreview asset={asset} />
            ) : (
              <article className="image-card">
                <img
                  src={asset.preview_url}
                  alt={`Locked preview ${index + 1}`}
                  width={800}
                  height={600}
                  loading={index < 2 ? 'eager' : 'lazy'}
                />
                <div className="image-caption">
                  <span>
                    <LockKeyhole size={14} aria-hidden="true" />{' '}
                    {asset.mime_type?.startsWith('video/') ? 'Video' : 'Photo'}{' '}
                    {index + 1}
                  </span>
                  <span>{fileSize(asset.size_bytes)}</span>
                </div>
              </article>
            )}
          </div>
        ))}
      </div>
      {assets.length > 1 && (
        <nav className="buyer-gallery-controls" aria-label="Browse previews">
          <button
            type="button"
            aria-label="Previous preview"
            disabled={selected === 0}
            onClick={() => move(selected - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {selected + 1} / {assets.length}
          </span>
          <button
            type="button"
            aria-label="Next preview"
            disabled={selected === assets.length - 1}
            onClick={() => move(selected + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </section>
  );
}
