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

export {
  BuildFlowArt,
  DotGridBackdrop,
};
