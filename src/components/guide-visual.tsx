import {
  ArrowUpRight,
  Check,
  Download,
  GripVertical,
  ImagePlus,
  Play,
} from 'lucide-react';

import { ShareExamples } from './share-examples';

export function GuideVisual({ step }: { step: number }) {
  return (
    <div
      className={`guide-visual guide-visual-${step}`}
      aria-hidden={step === 2 ? undefined : true}
    >
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
          <div className="demo-pricing-cover">
            <img
              className="demo-pricing-photo"
              src="/examples/coast.webp"
              alt=""
              width={100}
              height={220}
              loading="lazy"
            />
            <img
              className="demo-watermark"
              src="/hidn-arrow-mark.svg"
              alt=""
              width={46}
              height={46}
            />
          </div>
          <div>
            <span className="demo-field-label">Drop title</span>
            <strong>Coastal collection</strong>
            <span className="demo-description">
              Sunlit cliffs and quiet coves, in full resolution.
            </span>
            <span className="demo-drop-size">3 files · 18.4 MB</span>
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
      {step === 2 && <ShareExamples />}
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
