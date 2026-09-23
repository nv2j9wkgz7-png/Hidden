export function BrandArt({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand-scene ${compact ? 'brand-scene-compact' : ''}`}
      aria-hidden="true"
    >
      <div className="brand-orbit" />
      <div className="brand-art-card art-card-back" />
      <div className="brand-art-card art-card-front">
        <div className="art-card-image">
          <img src="/hidn-arrow-mark.svg" alt="" width={180} height={180} />
        </div>
        <div className="art-card-caption">
          <span>A little mystery.</span>
          <strong>Something worth unlocking.</strong>
        </div>
      </div>
      <span className="art-chip">Private by design ↗</span>
    </div>
  );
}
