import { useEffect, useRef } from 'react';
import { cn } from 'cn';

import { useMediaQuery } from 'src/utils/hooks';

// The grid, and the bump the cursor raises in it.
const _SPACING = 32; // px between dots
const _BASE_RADIUS = 2.2;
const _BASE_ALPHA = 0.14;
const _REACH = 212; // px from the cursor to the foot of the bump (150 × √2: twice the area)
const _GROWTH = 0.225; // how much bigger a dot on the very top gets (0.225 = 22.5% bigger)
const _PUSH = 5; // px a dot on the bump's slope is pushed outward, the way a raised surface stretches
const _DARKEN = 0.1; // extra opacity for a dot on the very top
const _EASE = 0.16; // per frame: how quickly the bump catches up with the cursor and rises/settles

type Bump = { x: number; y: number; height: number };

// [Pure] Where a dot at rest at (x, y) is drawn with the bump under it, and how high it sits (0 to 1). The
// bump is a smooth dome: tallest under the cursor, flat by _REACH. Dots on its slope are pushed outward,
// so the grid looks stretched over something rising underneath.
function _getRaisedDot(x: number, y: number, bump: Bump) {
  const dx = x - bump.x;
  const dy = y - bump.y;
  const distance = Math.hypot(dx, dy);
  if (bump.height <= 0 || distance >= _REACH) {
    return { x, y, height: 0 };
  }
  const falloff = 1 - (distance / _REACH) ** 2;
  const height = falloff * falloff * bump.height;
  // Strongest on the slope, none at the top (distance 0) or the foot.
  const push = distance > 0 ? (_PUSH * height * Math.sin((Math.PI * distance) / _REACH)) / distance : 0;
  return { x: x + dx * push, y: y + dy * push, height };
}

// Intentions: the landing page's backdrop: a faint grid of dots across the whole page, and wherever the
// cursor hovers, the surface rises into a soft dome under it: the dots there grow, darken and spread
// outward, and the dome glides after the cursor and sinks back when it leaves the page. Drawn on one canvas
// fixed behind the page, so it only shows where sections leave the background bare. Colour: the brand
// green (--brand-strong). It only redraws while the dome is moving; with reduced motion on, it's the still grid.
// References: the Arcturis landing page (the reference the user picked).
export default function DotGridBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }
    const color = getComputedStyle(canvas).getPropertyValue('--brand-strong').trim() || 'gray';
    // Mutated in place: per-frame drawing state. `bump` is what's drawn, `target` is where the cursor
    // says it should be (height 1 while hovering, 0 once the cursor's gone); `bump` eases toward it.
    const bump: Bump = { x: 0, y: 0, height: 0 };
    const target: Bump = { x: 0, y: 0, height: 0 };
    let frame = 0;

    const draw = () => {
      frame = 0;
      // A fresh dome appears where the cursor is rather than sliding in from the last spot.
      if (bump.height < 0.01) {
        bump.x = target.x;
        bump.y = target.y;
      }
      bump.x += (target.x - bump.x) * _EASE;
      bump.y += (target.y - bump.y) * _EASE;
      bump.height += (target.height - bump.height) * _EASE;

      const { width, height } = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;
      for (let y = _SPACING / 2; y < height; y += _SPACING) {
        for (let x = _SPACING / 2; x < width; x += _SPACING) {
          const dot = _getRaisedDot(x, y, bump);
          context.globalAlpha = _BASE_ALPHA + dot.height * _DARKEN;
          context.beginPath();
          context.arc(dot.x, dot.y, _BASE_RADIUS * (1 + dot.height * _GROWTH), 0, Math.PI * 2);
          context.fill();
        }
      }
      // Keep going until the dome has caught up with the cursor.
      const isSettled = Math.abs(target.height - bump.height) < 0.005
        && Math.hypot(target.x - bump.x, target.y - bump.y) < 0.5;
      if (!isSettled) {
        frame = requestAnimationFrame(draw);
      }
    };
    const scheduleDraw = () => {
      if (!frame) {
        frame = requestAnimationFrame(draw);
      }
    };

    // Sharp on high-density screens: the bitmap is device pixels, drawing is in CSS pixels.
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      scheduleDraw();
    };
    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }
      // The canvas is fixed to the screen, so screen coordinates are canvas coordinates.
      target.x = event.clientX;
      target.y = event.clientY;
      target.height = 1;
      scheduleDraw();
    };
    const lowerBump = () => {
      target.height = 0;
      scheduleDraw();
    };

    resize();
    window.addEventListener('resize', resize);
    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', followPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', lowerBump);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', followPointer);
      document.documentElement.removeEventListener('pointerleave', lowerBump);
    };
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} aria-hidden='true' data-component='dot-grid' className={cn('pointer-events-none fixed inset-0 size-full', className)} />;
}
