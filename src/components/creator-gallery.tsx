'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fileSize } from '@/lib/format';

type Image = { id: string; name: string; size: number; url: string };

export function CreatorGallery({ images }: { images: Image[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const image = images[selected];
  function move(offset: number) {
    const index = (selected + offset + images.length) % images.length;
    track.current?.scrollTo({
      left: index * track.current.clientWidth,
      behavior: 'smooth',
    });
  }
  return (
    <>
      <div className="creator-gallery">
        {images.map((asset, index) => (
          <button
            type="button"
            className="creator-thumbnail"
            key={asset.id}
            aria-label={`View image ${index + 1}: ${asset.name}`}
            onClick={() => {
              setSelected(index);
              dialog.current?.showModal();
              if (track.current)
                track.current.scrollLeft = index * track.current.clientWidth;
            }}
          >
            <img
              src={asset.url}
              alt={asset.name}
              referrerPolicy="no-referrer"
            />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="image-viewer"
        aria-label="Your uploaded image"
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
          }
        }}
      >
        {image && (
          <div className="image-viewer-content">
            <header>
              <span>
                {selected + 1} / {images.length}
              </span>
              <button
                type="button"
                aria-label="Close image"
                onClick={() => dialog.current?.close()}
              >
                <X />
              </button>
            </header>
            <div
              ref={track}
              className="image-viewer-track"
              onScroll={(event) => {
                const el = event.currentTarget;
                if (el.clientWidth)
                  setSelected(
                    Math.max(
                      0,
                      Math.min(
                        images.length - 1,
                        Math.round(el.scrollLeft / el.clientWidth),
                      ),
                    ),
                  );
              }}
            >
              {images.map((asset) => (
                <div className="image-viewer-stage" key={asset.id}>
                  {failed.has(asset.id) ? (
                    <p role="alert">
                      This image link has expired. Close the viewer and refresh
                      the page to try again.
                    </p>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onError={() =>
                        setFailed((previous) => new Set(previous).add(asset.id))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <footer>
              <button
                type="button"
                aria-label="Previous image"
                disabled={images.length < 2}
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </button>
              <div aria-live="polite">
                <strong>{image.name}</strong>
                <small>{fileSize(image.size)}</small>
              </div>
              <button
                type="button"
                aria-label="Next image"
                disabled={images.length < 2}
                onClick={() => move(1)}
              >
                <ChevronRight />
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
