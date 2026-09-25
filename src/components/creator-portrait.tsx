export function CreatorPortrait({
  person = 'maya',
  className = '',
  priority = false,
  avatar = false,
}: {
  person?: 'maya' | 'jay' | 'nina';
  className?: string;
  priority?: boolean;
  avatar?: boolean;
}) {
  return (
    <img
      className={`creator-portrait portrait-${person} ${className}`}
      src={`/creators/${person}${avatar ? '-avatar' : ''}.webp`}
      width={avatar ? 192 : 640}
      height={avatar ? 192 : 640}
      alt=""
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
