'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronLeft, Link2 } from 'lucide-react';

export function ShareExamples() {
  const [view, setView] = useState<'bio' | 'message'>('bio');
  return (
    <div className="share-examples">
      <div
        className="share-example-switch"
        role="group"
        aria-label="Sharing example"
      >
        <button
          type="button"
          aria-pressed={view === 'bio'}
          onClick={() => setView('bio')}
        >
          Profile bio
        </button>
        <button
          type="button"
          aria-pressed={view === 'message'}
          onClick={() => setView('message')}
        >
          iMessage
        </button>
      </div>
      <div className="share-example-stage" aria-live="polite">
        {view === 'bio' ? (
          <div className="demo-bio" key="bio">
            <div className="demo-bio-heading">
              <img src="/examples/coast.webp" width={44} height={44} alt="" />
              <div>
                <strong>Coastal Studio</strong>
                <span>@coastalstudio · Example profile</span>
              </div>
            </div>
            <p>Coastlines, quiet moments &amp; places worth keeping.</p>
            <span className="demo-bio-caption">
              My latest photo collection ↓
            </span>
            <div className="demo-bio-link">
              <Link2 size={14} />
              <span>sendhidn.com/d/coastal</span>
              <ArrowUpRight size={14} />
            </div>
            <div className="demo-bio-grid" aria-hidden="true">
              {['coast', 'studio', 'botanical'].map((name) => (
                <img
                  key={name}
                  src={`/examples/${name}.webp`}
                  width={80}
                  height={60}
                  alt=""
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="demo-imessage" key="message">
            <div className="demo-chat-heading">
              <ChevronLeft size={16} />
              <span>Messages · Example</span>
            </div>
            <div className="demo-chat-bubble">
              Here’s my coastal collection 🌊
            </div>
            <div className="demo-chat-preview">
              <div className="demo-chat-photo">
                <img
                  src="/examples/coast.webp"
                  width={240}
                  height={100}
                  alt="Blurred coastal collection preview"
                />
                <img
                  className="demo-chat-watermark"
                  src="/hidn-arrow-mark.svg"
                  width={40}
                  height={40}
                  alt="Hidn watermark"
                />
              </div>
              <div className="demo-chat-detail">
                <strong>Unlock Coastal collection</strong>
                <span>3 private files · 18.4 MB · $18 USD</span>
                <small>sendhidn.com</small>
              </div>
            </div>
          </div>
        )}
      </div>
      <span className="share-example-note">
        Illustrative examples · previews vary by app
      </span>
    </div>
  );
}
