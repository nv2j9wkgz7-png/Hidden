'use client';
import { useState } from 'react';
import { Download, Play } from 'lucide-react';
import { CreatorGallery } from './creator-gallery';
import { fileSize } from '@/lib/format';

export function PaidGallery({
  dropId,
  assets,
  busy,
  download,
}: {
  dropId: string;
  assets: {
    id: string;
    original_filename: string;
    size_bytes: number;
    mime_type?: string;
  }[];
  busy: boolean;
  download: (id: string) => void;
}) {
  const [version, setVersion] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const images = assets.map((asset) => ({
    id: asset.id,
    name: asset.original_filename,
    size: asset.size_bytes,
    mime: asset.mime_type,
    url: `/api/media?drop_id=${dropId}&asset_id=${asset.id}&v=${version}`,
  }));
  function retry() {
    setFailed(new Set());
    setVersion((v) => v + 1);
  }
  return (
    <CreatorGallery
      key={version}
      images={images}
      label="Your purchased media"
      renderItems={(openImage) => (
        <div className="image-grid">
          {images.map((asset, index) => (
            <article className="image-card" key={asset.id}>
              {failed.has(asset.id) ? (
                <div className="buyer-media-error" role="alert">
                  <p>Couldn’t load this original.</p>
                  <button className="secondary" onClick={retry}>
                    Try again
                  </button>
                </div>
              ) : (
                <button
                  className="buyer-original"
                  aria-label={`View file ${index + 1}: ${asset.name}`}
                  onClick={() => openImage(index)}
                >
                  {asset.mime?.startsWith('video/') ? (
                    <>
                      <video
                        src={`${asset.url}#t=0.001`}
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="buyer-play">
                        <Play size={24} /> Play video
                      </span>
                    </>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      loading="lazy"
                      width={800}
                      height={800}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailed((previous) => new Set(previous).add(asset.id))
                      }
                    />
                  )}
                </button>
              )}
              <div className="image-caption">
                <span>
                  {asset.mime?.startsWith('video/') ? 'Video' : 'Photo'}{' '}
                  {String(index + 1).padStart(2, '0')} · {fileSize(asset.size)}
                </span>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => download(asset.id)}
                  aria-label={`Download file ${index + 1}`}
                >
                  <Download size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    />
  );
}
