export function CreatorPortrait({
  person = 'maya',
  className = '',
  priority = false,
}: {
  person?: 'maya' | 'jay' | 'nina';
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      className={`creator-portrait portrait-${person} ${className}`}
      src={`/creators/${person}.webp`}
      width={640}
      height={640}
      alt=""
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
