import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { useInterval } from 'src/utils/hooks';

// How many `chat_wait_<kind>_<n>` lines there are of each, in i18nMappings, and how long each one stays up.
const _WAIT_LINE_COUNTS = { short: 10, long: 10 };
const _WAIT_LINE_SECONDS = 12;

// [Pure-ish] Which line shows now: read off the clock, so every line gets its turn and a re-mount doesn't
// restart from the first one.
function _getLineIndex(kind: keyof typeof _WAIT_LINE_COUNTS) {
  return Math.floor(Date.now() / 1000 / _WAIT_LINE_SECONDS) % _WAIT_LINE_COUNTS[kind];
}

// Intentions: the "thinking" mark beside the short lines — a lavender spark that twinkles and slowly turns, with
// two lime dots orbiting it (one each way), like an idea being turned over. Sized like an icon. The lime is
// deepened toward the brand's strong green, since pure lime vanishes on the light page.
// With reduced motion it's a still spark.
function ThinkingSpark() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' className='size-5 shrink-0 overflow-visible'>
      <g className='origin-center animate-[wait-orbit_2.4s_linear_infinite] motion-reduce:animate-none'>
        <circle cx='12' cy='2.5' r='1.9' style={{ fill: 'color-mix(in oklab, var(--brand-light) 55%, var(--brand-strong))' }} />
      </g>
      <g className='origin-center animate-[wait-orbit_3.6s_linear_infinite_reverse] motion-reduce:animate-none'>
        <circle cx='12' cy='21.5' r='1.4' style={{ fill: 'color-mix(in oklab, var(--brand-light) 55%, var(--brand-strong))' }} />
      </g>
      <path
        d='M12 5.5 Q13 11 18.5 12 Q13 13 12 18.5 Q11 13 5.5 12 Q11 11 12 5.5 Z'
        className='origin-center animate-[wait-twinkle_1.8s_ease-in-out_infinite] motion-reduce:animate-none'
        style={{ fill: 'var(--brand-lavender)' }}
      />
    </svg>
  );
}

// Where each wisp of steam rises from (x over the cup), and how far into the loop it starts, so they take turns.
const _STEAM_WISPS = [{ x: 6, delay: '0s' }, { x: 10, delay: '-0.9s' }, { x: 14, delay: '-1.8s' }];

// Intentions: the mark beside the "go take a break" lines while the site's being built -- a cup of coffee with steam
// curling up off it: three wisps that wave as they rise and fade, one after another. The cup is the lucide coffee
// cup's outline (same weight as the app's other icons), without its static steam lines. With reduced motion the
// wisps stand still.
function SteamingCoffee() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='size-5 shrink-0 overflow-visible text-primary'>
      {_STEAM_WISPS.map(wisp => (
        <path
          key={wisp.x}
          d={`M${wisp.x} 6.5 q-1.2 -1.3 0 -2.6 q1.2 -1.3 0 -2.6`}
          strokeWidth='1.6'
          className='animate-[wait-steam_2.7s_ease-out_infinite] opacity-60 motion-reduce:animate-none'
          style={{ animationDelay: wisp.delay, transformBox: 'fill-box', transformOrigin: 'bottom center' }}
        />
      ))}
      <path d='M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1' />
    </svg>
  );
}

// Intentions: a calm line above the chat input while the agent is busy, so the wait feels looked after
// rather than stuck. Short, "thinking" lines while it's replying; longer "go take a break" ones while it's
// building the site, which takes minutes. A new line every few seconds, fading in.
// References: fourpixie-frontend components/pages/projects/pipeline/JobProgress.tsx (same lines, for games)
export default function AgentWaitLine({ isBuilding, className }: { isBuilding: boolean; className?: string }) {
  const { t } = useTranslation();
  const kind = isBuilding ? 'long' : 'short';
  // Re-renders every second so the clock can move to the next line; which one shows is read off the clock.
  const [, setTick] = useState(0);
  useInterval(() => setTick(tick => tick + 1), 1000);
  const shownIndex = _getLineIndex(kind);

  return (
    <p
      key={`${kind}-${shownIndex}`}
      role='status'
      data-waitline={`${kind}_${shownIndex + 1}`}
      className={cn('mb-2 flex items-center justify-start gap-2 text-left text-sm text-muted-foreground animate-in fade-in-0 duration-700', className)}
    >
      {isBuilding ? <SteamingCoffee /> : <ThinkingSpark />}
      {t(`chat_wait_${kind}_${shownIndex + 1}`)}
    </p>
  );
}
