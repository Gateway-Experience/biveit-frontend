import { useState } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

import { useInterval, useMediaQuery } from 'src/utils/hooks';

// The order the page is put together in, one step per beat. A part shows from its step on (`_isShown`).
// After the last part, the finished page holds for a few beats, then it starts over from a blank page.
const _STEPS = ['background', 'header', 'nav', 'title', 'subtitle', 'buttons', 'image', 'card1', 'card2', 'card3', 'footer'] as const;
type SketchPart = typeof _STEPS[number];
const _HOLD_BEATS = 5;
const _BEAT_MS = 650;
// Beat 0 is the blank page, then one beat per part, then the hold.
const _LOOP_BEATS = 1 + _STEPS.length + _HOLD_BEATS;

// How a part comes in: it's there but invisible (and slightly off) until its step, then eases into place.
const _ENTER_CLASS = 'transition-all duration-500 ease-out';
const _HIDDEN_CLASS = 'translate-y-3 scale-[0.98] opacity-0';

// [Pure] Whether `part` is on the page at `beat` (beat 0 = blank page, beat 1 = the first part, and so on).
function _isShown(part: SketchPart, beat: number) {
  return beat >= _STEPS.indexOf(part) + 1;
}

// Intentions: while the agent builds, the preview shows a website being put together from nothing: a blank
// page, then its background, header, headline, buttons, picture and cards, one after another, on a loop.
// It's an illustration of "your site is being made", not the real site (which may be half-done, or still
// the previous build), so it covers the preview entirely. It carries the project's own name and tagline so
// it still feels like theirs. With reduced motion on, it's the finished page, still.
// Sized by the preview panel, not the window (a container, with cqw units): the panel can be narrow even on
// a wide screen. Below @lg the menu links hide and the picture goes under the headline.
// Original purpose: the preview's "building" state (see SitePreview).
export default function BuildSketch({ siteName, tagline, className }: {
  siteName: string;
  // A line under the headline, e.g. the start of the project's description. Empty = placeholder bars.
  tagline?: string;
  className?: string;
}) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [tick, setTick] = useState(0);
  useInterval(() => setTick(previous => previous + 1), prefersReducedMotion ? null : _BEAT_MS);
  const beat = prefersReducedMotion ? _LOOP_BEATS : tick % _LOOP_BEATS;
  const partClass = (part: SketchPart) => cn(_ENTER_CLASS, !_isShown(part, beat) && _HIDDEN_CLASS);

  return (
    <div aria-hidden='true' data-component='build-sketch' data-beat={beat} className={cn('@container relative overflow-hidden bg-card', className)}>
      {/* The page's own background, fading in over the blank page. */}
      <div className={cn('absolute inset-0 bg-linear-to-b from-accent via-card to-card transition-opacity duration-700', !_isShown('background', beat) && 'opacity-0')} />

      <div className='relative flex h-full flex-col gap-[4%] px-[6%] pt-[3%]'>
        <header className={cn('flex items-center justify-between rounded-xl border bg-card/80 px-[3%] py-[1.6%] shadow-sm', partClass('header'))}>
          <span className='flex items-center gap-2 font-heading text-[clamp(0.8rem,1.6cqw,1.05rem)] font-bold'>
            <span className='size-[1.4em] rounded-md bg-brand-strong/80' />
            <span className='truncate'>{siteName}</span>
          </span>
          <span className={cn('flex items-center gap-[clamp(0.5rem,1.5cqw,1.25rem)]', partClass('nav'))}>
            {_.times(3, index => <span key={index} className='hidden h-2 w-12 rounded-full bg-muted-foreground/25 @lg:block' />)}
            <span className='h-[clamp(1.4rem,3cqw,2rem)] w-[clamp(3.5rem,8cqw,5.5rem)] rounded-full bg-primary' />
          </span>
        </header>

        <section className='grid flex-1 grid-cols-1 content-center items-center gap-[5%] @lg:grid-cols-[1.1fr_1fr]'>
          <div className='flex min-w-0 flex-col gap-[clamp(0.5rem,1.6cqw,1rem)]'>
            <p className={cn('font-heading text-[clamp(1.3rem,3.4cqw,2.6rem)] leading-[1.05] font-bold tracking-tight text-balance', partClass('title'))}>
              {siteName}
            </p>
            <div className={cn('flex flex-col gap-2', partClass('subtitle'))}>
              {tagline
                ? <p className='line-clamp-2 text-[clamp(0.75rem,1.4cqw,0.95rem)] text-muted-foreground'>{tagline}</p>
                : _.times(2, index => <span key={index} className={cn('h-2.5 rounded-full bg-muted-foreground/20', index ? 'w-2/3' : 'w-5/6')} />)}
            </div>
            <div className={cn('flex gap-3 pt-1', partClass('buttons'))}>
              <span className='h-[clamp(1.8rem,4.5cqw,2.6rem)] w-[clamp(5rem,12cqw,8rem)] rounded-full bg-primary shadow-sm' />
              <span className='h-[clamp(1.8rem,4.5cqw,2.6rem)] w-[clamp(4rem,9cqw,6rem)] rounded-full border bg-card' />
            </div>
          </div>
          <div className={cn('aspect-[16/7] overflow-hidden rounded-2xl bg-linear-to-br from-highlight via-chart-2/60 to-brand-light/50 shadow-md @lg:aspect-[4/3]', partClass('image'))}>
            {/* A soft shine across the picture, like an image that's just been placed. */}
            <span className='block size-full bg-linear-to-tr from-transparent via-card/30 to-transparent' />
          </div>
        </section>

        <section className='grid grid-cols-3 gap-[3%] pb-[3%]'>
          {(['card1', 'card2', 'card3'] as const).map(part => (
            <div key={part} className={cn('flex flex-col gap-2 rounded-xl border bg-card p-[6%] shadow-sm', partClass(part))}>
              <span className='aspect-[16/10] rounded-lg bg-secondary' />
              <span className='h-2 w-3/4 rounded-full bg-muted-foreground/30' />
              <span className='h-2 w-1/2 rounded-full bg-muted-foreground/15' />
            </div>
          ))}
        </section>

        <footer className={cn('mt-auto mb-[2%] flex items-center justify-between border-t pt-[1.6%]', partClass('footer'))}>
          <span className='h-2 w-24 rounded-full bg-muted-foreground/20' />
          <span className='flex gap-3'>{_.times(3, index => <span key={index} className='size-3 rounded-full bg-muted-foreground/20' />)}</span>
        </footer>
      </div>
    </div>
  );
}
