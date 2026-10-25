import { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

// A four-point sparkle, centred on (x, y).
function _Sparkle({ x, y, size }: { x: number; y: number; size: number }) {
  const half = size / 2;
  const waist = size / 7;
  return (
    <path
      d={`M${x} ${y - half}L${x + waist} ${y - waist}L${x + half} ${y}L${x + waist} ${y + waist}L${x} ${y + half}L${x - waist} ${y + waist}L${x - half} ${y}L${x - waist} ${y - waist}Z`}
      fill='var(--brand-light)'
    />
  );
}

// Intentions: the whole product in a few thin strokes. A chat bubble (you describe it), a dotted trail,
// and a browser window with a site taking shape (we build it), plus a cursor and some sparkles.
// Line art in theme colors only, so it's weightless and follows light/dark mode.
// Original purpose: decoration for the projects page (its header and its empty state).
function BuildFlowArt({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 340 170' fill='none' aria-hidden='true' className={cn('text-brand-strong', className)}>
      <g stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'>
        {/* The chat bubble */}
        <path d='M18 82a12 12 0 0 1 12-12h66a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12H48l-14 11v-11h-4a12 12 0 0 1-12-12Z' fill='var(--card)' strokeOpacity={0.55} />
        <path d='M33 89h52M33 100h34' strokeOpacity={0.35} />

        {/* The trail from the idea to the site */}
        <path d='M108 92C132 92 128 60 152 58' strokeOpacity={0.45} strokeDasharray='2 5' />

        {/* The browser window */}
        <rect x='152' y='22' width='170' height='128' rx='12' fill='var(--card)' strokeOpacity={0.55} />
        <path d='M152 42h170' strokeOpacity={0.3} />
        <g fill='currentColor' stroke='none' fillOpacity={0.3}>
          <circle cx='164' cy='32' r='2.5' />
          <circle cx='173' cy='32' r='2.5' />
          <circle cx='182' cy='32' r='2.5' />
        </g>
        {/* The site inside it: a hero band, a headline, and a row of cards */}
        <rect x='166' y='54' width='142' height='36' rx='6' fill='currentColor' fillOpacity={0.1} stroke='none' />
        <path d='M176 66h60M176 77h38' strokeOpacity={0.5} />
        <rect x='272' y='63' width='26' height='18' rx='9' fill='currentColor' fillOpacity={0.55} stroke='none' />
        <rect x='166' y='100' width='42' height='36' rx='5' strokeOpacity={0.35} />
        <rect x='216' y='100' width='42' height='36' rx='5' strokeOpacity={0.35} />
        <rect x='266' y='100' width='42' height='36' rx='5' strokeOpacity={0.35} strokeDasharray='3 4' />

        {/* The cursor, still placing the last card */}
        <path d='M287 120l0 18 5-5 4 8 3-1.5-4-8h7Z' fill='currentColor' stroke='none' />
      </g>
      <_Sparkle x={136} y={36} size={12} />
      <_Sparkle x={316} y={14} size={9} />
      <_Sparkle x={30} y={56} size={7} />
    </svg>
  );
}

// A faint dotted grid that fades out towards the bottom; sits behind a panel's content.
function DotGridBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden='true'
      className={cn('pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[18px_18px] mask-b-from-10% mask-b-to-90%', className)}
    />
  );
}

// The rabbits playing on the project page's meadow: one runs, one chases it, a small one tags along behind. `run` is
// the crossing's keyframes (index.css: steady, or the chaser's dash-and-ease), `delay` when it first sets off (s),
// `hopSeconds` its hopping rhythm. They all loop every _RABBIT_LOOP_SECONDS, so they stay together round after round.
const _RABBIT_LOOP_SECONDS = 36;
const _RABBITS = [
  { id: 'leader', run: 'daydream-rabbit-run', delay: 3, width: 46, hopSeconds: 0.55 },
  { id: 'chaser', run: 'daydream-rabbit-chase', delay: 4.2, width: 44, hopSeconds: 0.5 },
  { id: 'little', run: 'daydream-rabbit-run', delay: 6, width: 32, hopSeconds: 0.42 },
];

// Intentions: which rabbit the pointer is over, if any (its id), so it can stop and let itself be looked at. The
// backdrop sits behind the page and never gets the pointer itself (the page's layout is in front of it, even in the
// margins), so this follows the pointer across the window instead, once a frame at most. A rabbit behind a panel
// (anything marked `data-workspace-panel`) doesn't count: it can't be seen there.
function useRabbitUnderPointer(meadowRef: React.RefObject<HTMLDivElement | null>) {
  const [rabbitId, setRabbitId] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const findRabbit = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const isBehindPanel = !!document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-workspace-panel]');
        const rabbits = Array.from(meadowRef.current?.querySelectorAll<HTMLElement>('[data-rabbit]') || []);
        const rabbitUnderPointer = isBehindPanel ? undefined : _.find(rabbits, (rabbit) => {
          const box = rabbit.getBoundingClientRect();
          return event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
        });
        setRabbitId(rabbitUnderPointer?.dataset.rabbit ?? null);
      });
    };
    const forgetRabbit = () => setRabbitId(null);
    window.addEventListener('pointermove', findRabbit);
    document.documentElement.addEventListener('pointerleave', forgetRabbit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', findRabbit);
      document.documentElement.removeEventListener('pointerleave', forgetRabbit);
    };
  }, [meadowRef]);

  return rabbitId;
}

// Original purpose: the project page's backdrop, the space around the chat (never inside it). A calm daydream to
// wait in while the agent works: a daytime meadow under a soft sky, clouds drifting, faint sparkles, and a tree on
// the right whose leaves drift down, and rabbits chasing each other across the meadow from left to right now and
// then (pointing at one makes it stop and wait until the pointer moves off). Mostly seen in the margins beside the
// chat; the panels sit on top of it.
// The art (`daydream-backdrop` in index.css: pieces in public/daydream-*.svg) is drawn at a fixed size whatever
// the window, with the tree pinned to the bottom right and its root on the bottom edge; only the sky and the
// meadow strips stretch. The pieces move on their own with CSS animations inside them, which they stop
// themselves for reduced motion.
// Light theme only: it's a daytime scene. The dark theme keeps its night-sky gradient underneath, without the
// picture.
// Fills its nearest positioned ancestor, behind everything else in it (`-z-10`), so that ancestor needs its own
// stacking context (`isolate`).
function WorkspaceBackdrop({ className }: { className?: string }) {
  const meadowRef = useRef<HTMLDivElement>(null);
  const pausedRabbitId = useRabbitUnderPointer(meadowRef);

  return (
    <div
      aria-hidden='true'
      data-component='workspace-backdrop'
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-linear-to-b from-backdrop-top to-backdrop-bottom',
        className,
      )}
    >
      <div className='daydream-backdrop absolute inset-0 dark:hidden' />
      {/* The meadow band the rabbits cross, at grass level. Gone for reduced motion: rabbits standing still
          wherever the loop left them would look odd. */}
      <div ref={meadowRef} data-section='rabbits' className='@container absolute inset-x-0 bottom-14 h-10 motion-reduce:hidden dark:hidden'>
        {_.map(_RABBITS, (rabbit) => {
          // Stopped: both its run and its hop freeze where they are, and pick up from there.
          const playState = pausedRabbitId === rabbit.id ? 'paused' : 'running';
          return (
            <div
              key={rabbit.id}
              data-rabbit={rabbit.id}
              data-paused={playState === 'paused' || undefined}
              className='absolute bottom-0 left-0'
              style={{
                animationName: rabbit.run,
                animationDuration: `${_RABBIT_LOOP_SECONDS}s`,
                animationTimingFunction: 'linear',
                animationDelay: `${rabbit.delay}s`,
                animationIterationCount: 'infinite',
                animationFillMode: 'backwards',
                animationPlayState: playState,
              }}
            >
              <div
                className='daydream-rabbit'
                style={{
                  width: rabbit.width,
                  aspectRatio: '3 / 2',
                  animationName: 'daydream-rabbit-hop',
                  animationDuration: `${rabbit.hopSeconds}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationPlayState: playState,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Intentions: the projects page's backdrop, behind the whole page area: warm white with soft lime and lavender
// washes and cropped website outlines in the bottom corners, leaving the middle clear for the project cards.
// The art is drawn at a fixed size whatever the window, each corner's pinned to its corner (`dashboard-washes`
// and `dashboard-outlines` in index.css; the outlines are public/dashboard-outline-*.svg, which move gently on
// their own with CSS animations inside them and stop themselves for reduced motion).
// Light theme only: drawn for warm white, it'd glare on the dark theme, which keeps its own background. Needs a
// stacking context on the page area to sit in (DefaultLayout's `isolate`).
function DashboardBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden='true'
      data-component='dashboard-backdrop'
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-dashboard-backdrop', className)}
    >
      <div className='dashboard-washes absolute inset-0 dark:hidden' />
      {/* A faint grain over the washes (a static tile), so the gradients' steps can't line up into rings in
          browsers that don't smooth them themselves. Only where the washes are: it fades out above them, so the
          plain top of the page stays clean. */}
      <div className='absolute inset-0 bg-[url(/backdrop-grain.png)] bg-size-[128px] mask-[linear-gradient(to_top,black_520px,transparent_660px)] dark:hidden' />
      <div className='dashboard-outlines absolute inset-0 dark:hidden' />
    </div>
  );
}

export {
  BuildFlowArt,
  DashboardBackdrop,
  DotGridBackdrop,
  WorkspaceBackdrop,
};
