export function CollectionArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`collection-art${compact ? ' collection-art-compact' : ''}`}
      aria-hidden="true"
    >
      <span className="collection-art-halo" />
      <img
        src={compact ? '/hidn-utility-ribbon.svg' : '/hidn-library-art.svg'}
        alt=""
        width={320}
        height={240}
      />
    </div>
  );
}
