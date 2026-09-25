'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { fileSize } from '@/lib/format';
import { MediaTypeBadge } from './media-type-badge';

type Image = {
  id: string;
  name: string;
  size: number;
  url: string;
  mime?: string;
  thumbnailUrl?: string;
  freePreview?: boolean;
};

export function CreatorGallery({
  images,
  renderItems,
  label = 'Your uploaded media',
}: {
  images: Image[];
  renderItems?: (openImage: (index: number) => void) => ReactNode;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const currentIndex = Math.min(selected, Math.max(0, images.length - 1));
  const image = images[currentIndex];
  function pauseVideos() {
    dialog.current?.querySelectorAll('video').forEach((video) => video.pause());
  }
  useEffect(() => {
    pauseVideos();
  }, [currentIndex]);
  function openImage(index: number) {
    setSelected(index);
    setFailed(new Set());
    setOpened(true);
  }
  useEffect(() => {
    if (!opened) return;
    dialog.current?.showModal();
    if (track.current)
      track.current.scrollLeft = selected * track.current.clientWidth;
  }, [opened]);
  function move(offset: number) {
    const index = (currentIndex + offset + images.length) % images.length;
    track.current?.scrollTo({
      left: index * track.current.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  return (
    <>
      {renderItems ? (
        renderItems(openImage)
      ) : (
        <div className="creator-gallery">
          {images.map((asset, index) => (
            <button
              type="button"
              className="creator-thumbnail"
              key={asset.id}
              aria-label={`View ${asset.mime?.startsWith('video/') ? 'video' : 'photo'} ${index + 1}: ${asset.name}`}
              onClick={() => openImage(index)}
            >
              <MediaTypeBadge mime={asset.mime} />
              {asset.freePreview && (
                <span className="gallery-free-label">
                  <Eye size={12} aria-hidden="true" />
                  Free preview
                </span>
              )}
              {asset.mime?.startsWith('video/') && !asset.thumbnailUrl ? (
                <>
                  <video
                    src={`${asset.url}#t=0.001`}
                    muted
                    playsInline
                    preload="metadata"
                  />
                </>
              ) : (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.name}
                  referrerPolicy="no-referrer"
                />
              )}
            </button>
          ))}
        </div>
      )}
      {mounted &&
        createPortal(
          <dialog
            ref={dialog}
            className="image-viewer"
            aria-label={label}
            onClose={() => {
              pauseVideos();
              setOpened(false);
            }}
            onKeyDown={(event) => {
              if ((event.target as HTMLElement).tagName === 'VIDEO') return;
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
            {opened && image && (
              <div className="image-viewer-content">
                <header>
                  <span>
                    {currentIndex + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    aria-label="Close preview"
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
                  {images.map((asset, index) => (
                    <div className="image-viewer-stage" key={asset.id}>
                      {Math.abs(index - currentIndex) > 1 ? null : failed.has(
                          asset.id,
                        ) ? (
                        <p role="alert">
                          This file link has expired. Close the viewer and
                          refresh the page to try again.
                        </p>
                      ) : asset.mime?.startsWith('video/') ? (
                        <div className="video-viewer-stage">
                          <video
                            src={asset.url}
                            controls
                            playsInline
                            preload="metadata"
                            aria-label={asset.name}
                          />
                          <small>
                            If this browser cannot play the video, download the
                            original to view it.
                          </small>
                          <a
                            href={asset.url}
                            download={asset.name}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open original video ↗
                          </a>
                        </div>
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          draggable={false}
                          onError={() =>
                            setFailed((previous) =>
                              new Set(previous).add(asset.id),
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
                <footer>
                  <button
                    type="button"
                    aria-label="Previous file"
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
                    aria-label="Next file"
                    disabled={images.length < 2}
                    onClick={() => move(1)}
                  >
                    <ChevronRight />
                  </button>
                </footer>
              </div>
            )}
          </dialog>,
          document.body,
        )}
    </>
  );
}
