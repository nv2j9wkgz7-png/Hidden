'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronLeft, Link2 } from 'lucide-react';

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
          X profile
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
          <div
            className="demo-bio demo-x-profile"
            key="bio"
            aria-label="Example X profile with a Hidn link in its bio"
          >
            <div className="demo-x-top">
              <ArrowLeft size={14} />
              <strong>Coastal Studio</strong>
              <span aria-label="X">𝕏</span>
            </div>
            <img
              className="demo-x-cover"
              src="/examples/coast.webp"
              width={320}
              height={60}
              alt=""
            />
            <div className="demo-x-body">
              <div className="demo-x-avatar-row">
                <img
                  src="/examples/studio.webp"
                  width={46}
                  height={46}
                  alt=""
                />
                <span className="demo-x-follow">Follow</span>
              </div>
              <div className="demo-bio-heading">
                <strong>Coastal Studio</strong>
                <span>@coastalstudio</span>
              </div>
              <p>Coastlines, quiet moments &amp; places worth keeping.</p>
              <span className="demo-bio-caption">
                My latest photo collection ↓
              </span>
              <div className="demo-bio-link">
                <Link2 size={13} />
                <span>sendhidn.com/d/coastal</span>
              </div>
              <div className="demo-x-stats">
                <span>
                  <strong>128</strong> Following
                </span>
                <span>
                  <strong>2,410</strong> Followers
                </span>
              </div>
            </div>
            <div className="demo-x-tabs" aria-hidden="true">
              <span>Posts</span>
              <span>Replies</span>
              <span>Media</span>
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
