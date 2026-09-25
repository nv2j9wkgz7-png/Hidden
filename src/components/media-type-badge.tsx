import { ImageIcon, Video } from 'lucide-react';

export function MediaTypeBadge({ mime }: { mime?: string }) {
  const video = mime?.startsWith('video/');
  const Icon = video ? Video : ImageIcon;
  return (
    <span
      className="media-type-badge"
      title={video ? 'Video' : 'Photo'}
      aria-hidden="true"
    >
      <Icon size={14} strokeWidth={1.8} />
    </span>
  );
}
