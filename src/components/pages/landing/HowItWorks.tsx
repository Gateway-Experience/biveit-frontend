import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { ArrowDownIcon, ArrowRightIcon, CheckCircle2Icon, CornerDownLeftIcon, LockIcon } from 'lucide-react';
import { cn } from 'cn';

import Reveal from 'src/components/common/Reveal';
import ScaledFrame from 'src/components/common/ScaledFrame';
import { MotoRentalSite } from 'src/components/pages/landing/ExampleSites';
import { BrowserDots, CHAT_STAGES, ChatPreviewCard } from 'src/components/pages/landing/ProductSnippets';
import { useInterval, useMediaQuery } from 'src/utils/hooks';

const _STEPS = [
  { id: 'talk', titleKey: 'landing_step1_title', descKey: 'landing_step1_body' },
  { id: 'build', titleKey: 'landing_step2_title', descKey: 'landing_step2_body' },
  { id: 'live', titleKey: 'landing_step3_title', descKey: 'landing_step3_body' },
];

// Counts beats 0, 1, ... beatCount - 1 and round again, one every beatMs: each picture below plays its little
// story off it, on a loop. With reduced motion on, it sits on the last beat (the finished picture).
function useBeat(beatCount: number, beatMs: number) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [beat, setBeat] = useState(0);
  useInterval(() => setBeat(previous => (previous + 1) % beatCount), prefersReducedMotion ? null : beatMs);
  return prefersReducedMotion ? beatCount - 1 : beat;
}

// The picture in each step's frame: a little piece of the product at that stage, playing out on a loop.

// The chat plays out: the message, the agent typing and replying, the options, the pick; then it holds a
// moment and starts over.
function TalkVisual() {
  // A beat per chat stage, plus a few to hold the finished chat before starting over.
  const beat = useBeat(CHAT_STAGES.picked + 4, 900);
  return <ChatPreviewCard stage={beat} className='w-[300px] shrink-0 -translate-y-3 scale-[0.78] shadow-xl' />;
}

const _BUILD_TILE_COUNT = 3;

// The site builds itself: the banner sweeps in, the tiles pop up one by one, the progress bar fills along
// the way; a check when it's done, a pause, and again.
function BuildVisual() {
  // Beat 0 is the blank page; 1 the banner; 2–4 the tiles; 5 done; then a few to hold.
  const beat = useBeat(_BUILD_TILE_COUNT + 6, 700);
  const isDone = beat >= _BUILD_TILE_COUNT + 2;
  const progress = Math.min(beat / (_BUILD_TILE_COUNT + 2), 1);

  return (
    <div data-buildbeat={beat} className='w-60 overflow-hidden rounded-xl border bg-card shadow-xl'>
      <div className='flex items-center justify-between border-b px-2.5 py-2'>
        <BrowserDots />
        <CheckCircle2Icon className={cn('size-3.5 text-success transition-all duration-300', isDone ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} />
      </div>
      <div className='flex flex-col gap-2 p-3'>
        <div className={cn('h-12 origin-left rounded-lg bg-linear-to-r from-highlight to-chart-2 transition-all duration-500 ease-out', beat < 1 && 'scale-x-0 opacity-0')} />
        <div className='grid grid-cols-3 gap-2'>
          {_.times(_BUILD_TILE_COUNT, index => (
            <div key={index} className={cn('h-9 rounded-md bg-muted transition-all duration-400 ease-out', beat < index + 2 && 'scale-75 opacity-0')} />
          ))}
        </div>
        <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
          <div className='h-full rounded-full bg-linear-to-r from-brand-light to-brand-deep transition-[width] duration-700 ease-out' style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// The browser's beats (one every 80ms), from typing the address to the site being up.
const _LIVE_BEATS = { afterTyping: 4, enterHeld: 3, loading: 6, liveAfterSite: 4, hold: 38 };

// A browser opens on a blank tab: the address types itself in, Enter gets pressed, a quick load, and the
// site appears, with the green "Live" tag popping up under it. It holds, then starts over.
function LiveVisual() {
  const { t } = useTranslation();
  const domainChars = Array.from(t('landing_example_domain_moto'));
  const domainLength = _.size(domainChars);
  const enterAt = domainLength + _LIVE_BEATS.afterTyping;
  const loadAt = enterAt + _LIVE_BEATS.enterHeld;
  const siteAt = loadAt + _LIVE_BEATS.loading;
  const liveAt = siteAt + _LIVE_BEATS.liveAfterSite;
  const beat = useBeat(liveAt + _LIVE_BEATS.hold, 80);
  const isEnterPressed = beat >= enterAt && beat < loadAt;
  const isLoading = beat >= loadAt && beat < siteAt;
  const isSiteShown = beat >= siteAt;

  return (
    <div data-livebeat={beat} className='flex w-64 flex-col items-center gap-3'>
      <div className='w-full overflow-hidden rounded-xl border bg-card shadow-xl'>
        {/* The address bar, with a thin loading line along its bottom while the page loads. */}
        <div className='relative flex items-center gap-2 border-b px-2.5 py-2'>
          <BrowserDots />
          <span className='flex min-w-0 flex-1 items-center gap-1 rounded-md bg-muted px-2 py-1 text-[0.6875rem] font-medium'>
            <LockIcon className={cn('size-3 shrink-0 transition-colors duration-300', isSiteShown ? 'text-success' : 'text-muted-foreground/50')} />
            <span className='truncate'>{domainChars.slice(0, beat).join('')}</span>
            {beat < enterAt && <span className='-ml-0.5 inline-block h-3 w-px shrink-0 animate-pulse bg-foreground' />}
          </span>
          {/* The Enter key, pressed once the address is in. */}
          <span className={cn(
            'grid size-5 shrink-0 place-items-center rounded border text-muted-foreground transition-all duration-150',
            isEnterPressed && 'translate-y-px scale-90 border-primary bg-primary text-primary-foreground',
          )}
          >
            <CornerDownLeftIcon className='size-3' />
          </span>
          <span className={cn('absolute bottom-0 left-0 h-0.5 bg-brand-strong transition-[width] ease-out', isLoading ? 'w-full duration-500' : 'w-0 duration-0')} />
        </div>
        {/* The page: blank until it loads, then the site fades in. */}
        <div className={cn('transition-opacity duration-500', isSiteShown ? 'opacity-100' : 'opacity-0')}>
          <ScaledFrame baseWidth={640} baseHeight={400}>
            <MotoRentalSite />
          </ScaledFrame>
        </div>
      </div>
      <span className={cn('flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success transition-all duration-500 ease-out', beat >= liveAt ? 'scale-100 opacity-100' : 'scale-75 opacity-0')}>
        <span className='relative flex size-1.5'>
          <span className='absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75' />
          <span className='relative size-1.5 rounded-full bg-success' />
        </span>
        {t('landing_scene_live')}
      </span>
    </div>
  );
}

const _STEP_VISUALS: Record<string, () => React.ReactNode> = { talk: TalkVisual, build: BuildVisual, live: LiveVisual };

// One step: its number and title over a frame with the picture. Hovering the frame (or focusing it, which is
// also what a tap does on phones) slides the step's explanation up over the picture, like the reference's cards.
function StepFrame({ step, index }: { step: typeof _STEPS[number]; index: number }) {
  const { t } = useTranslation();
  const StepVisual = _STEP_VISUALS[step.id];

  return (
    <div data-stepid={step.id} className='flex min-w-0 flex-col gap-3'>
      <p className='flex items-baseline gap-2 font-heading'>
        <span className='text-sm font-bold text-brand-strong'>{`0${index + 1}`}</span>
        <span className='text-xl font-bold tracking-[-0.02em]'>{t(step.titleKey)}</span>
      </p>
      <div
        tabIndex={0}
        aria-describedby={`step-details-${step.id}`}
        className='group/step relative isolate grid h-80 cursor-default place-items-center overflow-hidden rounded-3xl border bg-linear-to-br from-accent via-card to-highlight shadow-sm transition-shadow duration-300 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
      >
        <div className='transition-transform duration-500 ease-out group-focus-within/step:scale-90 group-focus-within/step:blur-[1px] group-hover/step:scale-90 group-hover/step:blur-[1px]'>
          <StepVisual />
        </div>
        {/* The explanation, sliding up over the picture. */}
        <div
          id={`step-details-${step.id}`}
          className='pointer-events-none absolute inset-x-3 bottom-3 translate-y-6 rounded-2xl bg-card/95 p-5 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out group-focus-within/step:translate-y-0 group-focus-within/step:opacity-100 group-hover/step:translate-y-0 group-hover/step:opacity-100'
        >
          <p className='text-sm leading-relaxed text-foreground'>{t(step.descKey)}</p>
        </div>
      </div>
    </div>
  );
}

// Original purpose: the landing page's "how it works" (after the Clear Street reference's interactive cards).
// Intentions: the three steps as three frames side by side, an arrow leading from each to the next (down
// instead of across on phones), each frame showing its explanation on hover.
export default function HowItWorks({ className }: { className?: string }) {
  return (
    <ol className={cn('grid items-start gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-3', className)}>
      {_STEPS.map((step, index) => (
        <Fragment key={step.id}>
          <Reveal as='li' delayMs={index * 150} className='min-w-0'>
            <StepFrame step={step} index={index} />
          </Reveal>
          {index < _STEPS.length - 1 && (
            <li aria-hidden='true' className='flex justify-center text-brand-strong md:h-80 md:items-center md:self-end'>
              <ArrowDownIcon className='size-6 md:hidden' />
              <ArrowRightIcon className='hidden size-6 md:block' />
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
