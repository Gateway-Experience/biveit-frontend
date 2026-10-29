import { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

// How far one arrow-key press moves the edge.
const _KEY_STEP_PX = 24;
// A press that moves less than this before letting go is a click, not a drag.
const _CLICK_SLOP_PX = 4;

// Intentions: the draggable edge between two side-by-side panels (the workspace's chat and preview). It sits
// in the gap between them and reports the left panel's new width; the caller clamps and stores it.
// The handle keeps the pointer while dragging (pointer capture), and iframes stop taking the pointer meanwhile
// (`data-panel-resizing` on <html>, see index.css): the preview is one, and would swallow the moves once the
// pointer is over it. Arrow keys move it too. A click (pressed and let go without dragging) asks for the default
// back: `onReset`.
// Click vs drag is worked out from the browser's own `click` (it always comes last, after the press is let go) and a
// ref (up to date within the same event), not from state across pointerup / lostpointercapture, whose order and
// re-renders in between differ by browser -- which left the click doing nothing in some.
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
  // The press under way: the pointer's x and the panel's width when it went down. null = not pressed.
  const pressRef = useRef<{ x: number; width: number } | null>(null);
  // Whether the last press moved far enough to be a drag; read by the click that follows it.
  const wasDragRef = useRef(false);
  // Only for looks (the bar's colour, and iframes ignoring the pointer meanwhile).
  const [isDragging, setIsDragging] = useState(false);
  const resizeTo = (nextWidth: number) => onResize(_.clamp(Math.round(nextWidth), minWidth, maxWidth));
  const endPress = () => {
    pressRef.current = null;
    setIsDragging(false);
  };

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
        pressRef.current = { x: event.clientX, width };
        wasDragRef.current = false;
      }}
      onPointerMove={(event) => {
        const press = pressRef.current;
        if (!press) {
          return;
        }
        const movedPx = event.clientX - press.x;
        if (!wasDragRef.current && Math.abs(movedPx) < _CLICK_SLOP_PX) {
          return;
        }
        if (!wasDragRef.current) {
          wasDragRef.current = true;
          setIsDragging(true);
        }
        resizeTo(press.width + movedPx);
      }}
      onPointerUp={endPress}
      onLostPointerCapture={endPress}
      onClick={() => {
        if (!wasDragRef.current) {
          onReset();
        }
        wasDragRef.current = false;
      }}
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
