import { useEffect, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

// How far one arrow-key press moves the edge.
const _KEY_STEP_PX = 24;

// Intentions: the draggable edge between two side-by-side panels (the workspace's chat and preview). It sits
// in the gap between them and reports the left panel's new width; the caller clamps and stores it.
// The handle keeps the pointer while dragging (pointer capture), and iframes stop taking the pointer meanwhile
// (`data-panel-resizing` on <html>, see index.css): the preview is one, and would swallow the moves once the
// pointer is over it. Arrow keys move it too, double-click asks for the default back.
export default function PanelResizeHandle({ width, minWidth, maxWidth, onResize, onReset, className }: {
  // The left panel's current width, in px (for the drag's starting point and screen readers).
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  onReset: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  // Where a drag started: the pointer's x and the panel's width then. null = not dragging.
  const [dragStart, setDragStart] = useState<{ x: number; width: number } | null>(null);
  const resizeTo = (nextWidth: number) => onResize(_.clamp(Math.round(nextWidth), minWidth, maxWidth));
  const isDragging = !_.isNull(dragStart);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    document.documentElement.dataset.panelResizing = '';
    return () => {
      delete document.documentElement.dataset.panelResizing;
    };
  }, [isDragging]);

  return (
    <div
      role='separator'
      aria-orientation='vertical'
      aria-label={t('workspace_resize')}
      aria-valuenow={Math.round(width)}
      aria-valuemin={Math.round(minWidth)}
      aria-valuemax={Math.round(maxWidth)}
      tabIndex={0}
      title={t('workspace_resize_hint')}
      data-component='panel-resize-handle'
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragStart({ x: event.clientX, width });
      }}
      onPointerMove={event => dragStart && resizeTo(dragStart.width + event.clientX - dragStart.x)}
      onPointerUp={() => setDragStart(null)}
      onLostPointerCapture={() => setDragStart(null)}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          resizeTo(width + (event.key === 'ArrowRight' ? _KEY_STEP_PX : -_KEY_STEP_PX));
        }
      }}
      className={cn(
        'group relative flex w-4 flex-none cursor-col-resize items-center justify-center outline-none',
        className,
      )}
    >
      <span
        className={cn(
          'h-12 w-1 rounded-full bg-foreground/15 transition-colors',
          'group-hover:bg-primary group-focus-visible:bg-primary',
          isDragging && 'bg-primary',
        )}
      />
    </div>
  );
}
