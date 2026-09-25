'use client';
import { Eye, Download } from 'lucide-react';
import { CreatorGallery } from './creator-gallery';
import { fileSize } from '@/lib/format';

export function FreePreview({
  asset,
}: {
  asset: {
    id: string;
    original_filename: string;
    mime_type?: string;
    size_bytes: number;
  };
}) {
  const url = `/api/public-preview?asset_id=${asset.id}`;
  const video = asset.mime_type?.startsWith('video/');
  return (
    <article className="image-card free-preview">
      {video ? (
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          aria-label="Free video preview"
        />
      ) : (
        <CreatorGallery
          label="Free preview"
          images={[
            {
              id: asset.id,
              name: 'Free preview',
              url,
              size: asset.size_bytes,
              mime: asset.mime_type,
            },
          ]}
          renderItems={(open) => (
            <button
              type="button"
              className="free-preview-open"
              onClick={() => open(0)}
              aria-label="View free preview full size"
            >
              <img
                src={url}
                alt="Free preview — visible before purchase"
                width={800}
                height={600}
                referrerPolicy="no-referrer"
              />
            </button>
          )}
        />
      )}
      <div className="image-caption">
        <span>
          <Eye size={14} /> Free preview · {fileSize(asset.size_bytes)}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open free preview file"
        >
          <Download size={18} />
        </a>
      </div>
    </article>
  );
}
