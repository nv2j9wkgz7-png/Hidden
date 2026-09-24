import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  GripVertical,
  ImagePlus,
  LockKeyhole,
  Play,
} from 'lucide-react';

export function GuideVisual({ step }: { step: number }) {
  return (
    <div className={`guide-visual guide-visual-${step}`} aria-hidden="true">
      <span className="guide-example-label">Example</span>
      {step === 0 && (
        <div className="demo-upload">
          <span className="demo-upload-label">
            <ImagePlus size={16} /> Your files <small>3 / 20</small>
          </span>
          <div className="demo-files">
            {['coast', 'studio', 'botanical'].map((name, i) => (
              <div className="demo-file" key={name}>
                <img
                  src={`/examples/${name}.webp`}
                  alt=""
                  loading="lazy"
                  width={100}
                  height={100}
                />
                {i === 0 ? (
                  <span className="demo-cover">Cover</span>
                ) : i === 2 ? (
                  <span className="demo-play">
                    <Play size={12} fill="currentColor" />
                  </span>
                ) : null}
                <span className="demo-grip">
                  <GripVertical size={12} />
                </span>
              </div>
            ))}
          </div>
          <span className="demo-file-ready">
            <Check size={12} /> Ready for your drop
          </span>
        </div>
      )}
      {step === 1 && (
        <div className="demo-pricing">
          <img
            src="/examples/coast.webp"
            alt=""
            width={100}
            height={140}
            loading="lazy"
          />
          <div>
            <span className="demo-field-label">Drop title</span>
            <strong>Coastal collection</strong>
            <span className="demo-field-label">Your price</span>
            <span className="demo-price">
              $18<small>USD</small>
            </span>
            <span className="demo-publish">
              Publish drop <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="demo-sharing">
          <div className="demo-link">
            <LockKeyhole size={14} />
            <span>sendhidn.com/d/…</span>
            <Copy size={15} />
          </div>
          <div className="demo-message">
            <div className="demo-message-photo">
              <img
                src="/examples/coast.webp"
                alt=""
                width={80}
                height={80}
                loading="lazy"
              />
              <LockKeyhole size={14} />
            </div>
            <div>
              <strong>Coastal collection</strong>
              <span>3 files · $18</span>
            </div>
            <ArrowUpRight size={16} />
          </div>
          <span className="demo-copied">
            <Check size={12} /> Link copied
          </span>
        </div>
      )}
      {step === 3 && (
        <div className="demo-unlocked">
          <span className="demo-paid">
            <Check size={13} /> Payment confirmed
          </span>
          <div className="demo-unlocked-photos">
            {['coast', 'studio', 'botanical'].map((name) => (
              <img
                src={`/examples/${name}.webp`}
                alt=""
                key={name}
                width={80}
                height={90}
                loading="lazy"
              />
            ))}
          </div>
          <span className="demo-download">
            <Download size={14} /> Download originals
          </span>
        </div>
      )}
    </div>
  );
}
