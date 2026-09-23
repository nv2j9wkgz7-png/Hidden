'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fileSize } from '@/lib/format';

type Image = { id: string; name: string; size: number; url: string };

export function CreatorGallery({ images }: { images: Image[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState(false);
  const image = images[selected];
  function move(offset: number) {
    setFailed(false);
    setSelected((index) => (index + offset + images.length) % images.length);
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
              setFailed(false);
              dialog.current?.showModal();
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
            <div className="image-viewer-stage">
              {failed ? (
                <p role="alert">
                  This image link has expired. Close the viewer and refresh the
                  page to try again.
                </p>
              ) : (
                <img
                  key={image.id}
                  src={image.url}
                  alt={image.name}
                  referrerPolicy="no-referrer"
                  onError={() => setFailed(true)}
                />
              )}
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
