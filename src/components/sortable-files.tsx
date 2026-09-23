'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableFile({
  id,
  name,
  disabled,
  reducedMotion,
  children,
}: {
  id: string;
  name: string;
  disabled: boolean;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    transition: reducedMotion
      ? null
      : { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  });
  return (
    <div
      ref={setNodeRef}
      data-sort-id={id}
      className={`file-row sortable-file ${isDragging ? 'file-drop-slot' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onPointerDown={(event) => {
        // Keep thumbnail viewing and removal independent. The grip also works
        // on touch; the rest of the row remains available for normal scrolling.
        if (
          event.pointerType === 'mouse' &&
          !(event.target as HTMLElement).closest('button, a, input')
        )
          listeners?.onPointerDown?.(event);
      }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="file-grip"
        disabled={disabled}
        {...attributes}
        {...listeners}
        aria-label={`Move ${name}`}
      >
        <GripVertical size={20} />
      </button>
      {children}
    </div>
  );
}

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
  const contextId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const ids = items.map(identify);
  const activeIndex = activeId === null ? -1 : ids.indexOf(activeId);
  const nameOf = (id: string | number) => {
    const item = items.find((item) => identify(item) === id);
    return item ? label(item) : 'File';
  };
  return (
    <div className="sortable-files">
      {items.length > 0 && (
        <p className="hint file-help">
          {items.length > 1 ? 'Drag the grip to reorder. ' : ''}Tap a thumbnail
          to preview.
          <span>First file is the cover. Changes save on Review.</span>
        </p>
      )}
      <DndContext
        id={contextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              'Press Space to pick up a file, arrow keys to move it, Space to drop, or Escape to cancel.',
          },
          announcements: {
            onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
            onDragOver: ({ active, over }) =>
              over
                ? `${nameOf(active.id)}, position ${ids.indexOf(String(over.id)) + 1} of ${items.length}.`
                : undefined,
            onDragEnd: ({ active, over }) =>
              over
                ? `${nameOf(active.id)} dropped at position ${ids.indexOf(String(over.id)) + 1}.`
                : 'Move cancelled.',
            onDragCancel: () => 'Move cancelled. Original order kept.',
          },
        }}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (!over || disabled || active.id === over.id) return;
          const from = ids.indexOf(String(active.id)),
            to = ids.indexOf(String(over.id));
          if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableFile
              key={identify(item)}
              id={identify(item)}
              name={label(item)}
              disabled={disabled}
              reducedMotion={reducedMotion}
            >
              {render(item, index)}
            </SortableFile>
          ))}
        </SortableContext>
        {mounted &&
          createPortal(
            <DragOverlay
              adjustScale={false}
              zIndex={1100}
              dropAnimation={
                reducedMotion
                  ? null
                  : {
                      duration: 230,
                      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                      sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0' } },
                      }),
                    }
              }
            >
              {activeIndex >= 0 ? (
                <div
                  className="file-row file-drag-overlay"
                  aria-hidden="true"
                  inert
                >
                  <span className="file-grip">
                    <GripVertical size={20} />
                  </span>
                  {render(items[activeIndex], activeIndex)}
                </div>
              ) : null}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </div>
  );
}
