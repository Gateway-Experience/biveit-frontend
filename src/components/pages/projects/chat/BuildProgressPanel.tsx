import { useState } from 'react';
import { cn } from 'cn';

import AgentWaitLine from 'src/components/pages/projects/chat/AgentWaitLine';
import { BuildStatus } from 'src/components/pages/projects/preview/BuildIndicator';
import { useInterval } from 'src/utils/hooks';

// The bar eases toward this and never reaches it: we don't know how long a build takes, so it must never look done
// before BUILDING_DONE says so.
const _MAX_SHOWN_PERCENT = 95;
// How fast it eases: about 63% of the way there after this long, ~86% after twice that. Builds take minutes.
const _EASING_SECONDS = 4 * 60;

// [Pure] How full the bar looks after `elapsedSeconds`: quick at first, then slowing down -- an estimate, not a
// measurement (nothing reports a build's real progress).
function _getShownPercent(elapsedSeconds: number) {
  return _MAX_SHOWN_PERCENT * (1 - Math.exp(-elapsedSeconds / _EASING_SECONDS));
}

// Intentions: takes the chat input's place while the agent builds the site. Building takes minutes and the
// agent can't take messages meanwhile, so instead of an input that does nothing, a loading bar with the
// playful status and timer (BuildStatus) and the "go take a break" lines (AgentWaitLine).
// `since`: when the build started (DevenvBuild.since), which drives both the bar and the timer.
export default function BuildProgressPanel({ since, className }: { since: string; className?: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useInterval(() => setNowMs(Date.now()), 1000);
  const elapsedSeconds = Math.max(0, (nowMs - Date.parse(since)) / 1000);
  const shownPercent = _getShownPercent(elapsedSeconds);

  return (
    <div data-component='build-progress' className={cn('flex flex-col gap-3 rounded-2xl border bg-card px-4 py-4 shadow-sm', className)}>
      <BuildStatus since={since} className='text-sm' />
      <div
        role='progressbar'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(shownPercent)}
        className='relative h-2.5 overflow-hidden rounded-full bg-primary/15'
      >
        <div
          className='h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear'
          style={{ width: `${shownPercent}%` }}
        />
        {/* A soft shimmer over the bar, so it reads as alive even when the fill barely moves late in a build. */}
        <div className='absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/40 to-transparent' />
      </div>
      <AgentWaitLine isBuilding className='mb-0' />
    </div>
  );
}
