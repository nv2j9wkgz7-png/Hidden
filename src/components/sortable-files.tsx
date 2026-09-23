'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
export function SortableFiles<T>({
  items,
  identify,
  label,
  disabled,
  onChange,
  render,
}: {
  items: T[];
  identify: (item: T) => string;
  label: (item: T) => string;
  disabled: boolean;
  onChange: (items: T[]) => void;
  render: (item: T, index: number) => ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const latest = useRef(items);
  latest.current = items;
  const [dragging, setDragging] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const drag = useRef<{
    id: string;
    before: T[];
    y: number;
    x: number;
    frame: number;
  } | null>(null);
  useEffect(
    () => () => {
      if (drag.current) cancelAnimationFrame(drag.current.frame);
    },
    [],
  );
  function move(id: string, to: number) {
    const current = latest.current;
    const from = current.findIndex((item) => identify(item) === id);
    if (from < 0 || to < 0 || to >= current.length || from === to) return;
    const next = [...current];
    next.splice(to, 0, next.splice(from, 1)[0]);
    latest.current = next;
    onChange(next);
    setAnnouncement(
      `${label(next[to])}, position ${to + 1} of ${next.length}${to === 0 ? ', cover' : ''}`,
    );
  }
  function track() {
    const active = drag.current;
    if (!active) return;
    const rows = Array.from(
      list.current?.querySelectorAll<HTMLElement>('[data-sort-id]') || [],
    );
    const from = latest.current.findIndex(
      (item) => identify(item) === active.id,
    );
    rows.forEach((row, index) => {
      const rect = row.getBoundingClientRect();
      if (
        active.y >= rect.top &&
        active.y <= rect.bottom &&
        index !== from &&
        (index > from
          ? active.y > rect.top + rect.height / 2
          : active.y < rect.top + rect.height / 2)
      )
        move(active.id, index);
    });
    if (active.y < 90) window.scrollBy(0, -10);
    if (active.y > window.innerHeight - 90) window.scrollBy(0, 10);
    active.frame = requestAnimationFrame(track);
  }
  function finish(cancel = false) {
    const active = drag.current;
    if (!active) return;
    cancelAnimationFrame(active.frame);
    drag.current = null;
    setDragging(null);
    if (cancel) {
      latest.current = active.before;
      onChange(active.before);
      setAnnouncement('Reordering cancelled.');
    }
  }
  return (
    <div ref={list} className="sortable-files">
      <p className="hint" id="reorder-help">
        Drag the grip to reorder. First file is your cover. On a keyboard, focus
        a grip and use the arrow keys. Order saves when you review your drop.
      </p>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      {items.map((item, index) => {
        const id = identify(item);
        return (
          <div
            className={`file-row ${dragging === id ? 'file-dragging' : ''}`}
            data-sort-id={id}
            key={id}
          >
            <button
              type="button"
              className="file-grip"
              disabled={disabled}
              aria-label={`Reorder ${label(item)}`}
              aria-describedby="reorder-help"
              onPointerDown={(event) => {
                if (disabled || event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.focus();
                event.currentTarget.setPointerCapture(event.pointerId);
                drag.current = {
                  id,
                  before: [...items],
                  x: event.clientX,
                  y: event.clientY,
                  frame: 0,
                };
                setDragging(id);
                track();
              }}
              onPointerMove={(event) => {
                if (drag.current) {
                  drag.current.x = event.clientX;
                  drag.current.y = event.clientY;
                }
              }}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => finish()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') finish(true);
                if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
                  event.preventDefault();
                  move(id, index + (event.key === 'ArrowUp' ? -1 : 1));
                }
              }}
            >
              <GripVertical size={20} />
            </button>
            {render(item, index)}
          </div>
        );
      })}
    </div>
  );
}
