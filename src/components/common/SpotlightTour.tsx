import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import { Button } from 'src/components/shadui/button';

type SpotlightStep = {
  id: string;
  // The element the step points at: the one marked `data-tour={target}`.
  target: string;
  titleKey: string;
  bodyKey: string;
};

type Box = { top: number; left: number; width: number; height: number };

// How far the spotlight reaches past its element, the gap between it and the card, the card's distance from the
// window's edges, and the spotlight's.
const _SPOTLIGHT_PADDING_PX = 6;
const _CARD_GAP_PX = 14;
const _EDGE_MARGIN_PX = 16;
const _WINDOW_INSET_PX = 3;

function _findTarget(target: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
}

// [Pure-ish] Whether a step's element is on the page and takes up space: the sidebar's, say, aren't there on
// phones (it's a closed drawer) or when it's collapsed to its icon rail.
function _isTargetShown(target: string) {
  const box = _findTarget(target)?.getBoundingClientRect();
  return !!box && box.width > 0 && box.height > 0;
}

// [Pure] Where the card goes, next to the spotlight: to its right for things along the left edge (the sidebar),
// else below it, else above. Always kept inside the window.
function getCardPosition(spotlight: Box, card: { width: number; height: number }, viewport: { width: number; height: number }) {
  const clampTop = (top: number) => _.clamp(top, _EDGE_MARGIN_PX, Math.max(_EDGE_MARGIN_PX, viewport.height - card.height - _EDGE_MARGIN_PX));
  const clampLeft = (left: number) => _.clamp(left, _EDGE_MARGIN_PX, Math.max(_EDGE_MARGIN_PX, viewport.width - card.width - _EDGE_MARGIN_PX));
  const spotlightRight = spotlight.left + spotlight.width;
  const spotlightBottom = spotlight.top + spotlight.height;
  const isAlongLeftEdge = spotlightRight < viewport.width / 3;
  if (isAlongLeftEdge && spotlightRight + _CARD_GAP_PX + card.width + _EDGE_MARGIN_PX <= viewport.width) {
    return { top: clampTop(spotlight.top + spotlight.height / 2 - card.height / 2), left: spotlightRight + _CARD_GAP_PX };
  }
  const centredLeft = clampLeft(spotlight.left + spotlight.width / 2 - card.width / 2);
  if (spotlightBottom + _CARD_GAP_PX + card.height + _EDGE_MARGIN_PX <= viewport.height) {
    return { top: spotlightBottom + _CARD_GAP_PX, left: centredLeft };
  }
  return { top: clampTop(spotlight.top - _CARD_GAP_PX - card.height), left: centredLeft };
}

// Intentions: where the current step's element is on screen (padded into the spotlight's box), kept up to date
// as the page scrolls, resizes, or the element itself changes size. null until it's been measured.
function useSpotlightBox(target: string | undefined) {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    const element = target ? _findTarget(target) : null;
    if (!element) {
      return undefined;
    }
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        // Kept a little inside the window, so its ring still shows on things that touch an edge (the sidebar's).
        const top = Math.max(_WINDOW_INSET_PX, rect.top - _SPOTLIGHT_PADDING_PX);
        const left = Math.max(_WINDOW_INSET_PX, rect.left - _SPOTLIGHT_PADDING_PX);
        const bottom = Math.min(window.innerHeight - _WINDOW_INSET_PX, rect.bottom + _SPOTLIGHT_PADDING_PX);
        const right = Math.min(window.innerWidth - _WINDOW_INSET_PX, rect.right + _SPOTLIGHT_PADDING_PX);
        setBox({ top, left, width: right - left, height: bottom - top });
      });
    };
    measure();
    // Elements can still be sliding into place when the tour starts (the page's fade-up entrance), which no
    // observer sees, so look again once that's over.
    const settleTimer = window.setTimeout(measure, 700);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [target]);

  return box;
}

// Intentions: a guided tour over a page. Everything is dimmed except the one element the current step is about,
// which sits in a spotlight with a card beside it saying what it's for. While it's on, the page can't be used at
// all (no clicks, and the app is `inert`, so no keyboard either): only the card's buttons work. Next / Back walk
// the steps; Skip, Esc or the last step's button end it with `onFinish`, and the page is all theirs again.
// Steps whose element isn't on the page when the tour starts are left out (e.g. the sidebar's, on phones).
// Original purpose: the projects page's first-time tour (ProjectsTour).
export default function SpotlightTour({ steps, onFinish }: { steps: SpotlightStep[]; onFinish: () => void }) {
  const { t } = useTranslation();
  // The steps that can be shown, picked once the page is on screen. null = not picked yet.
  const [shownSteps, setShownSteps] = useState<SpotlightStep[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const step = shownSteps?.[stepIndex];
  const spotlight = useSpotlightBox(step?.target);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const isLastStep = stepIndex === _.size(shownSteps) - 1;
  const isOn = !!step;

  useEffect(() => {
    setShownSteps(_.filter(steps, stepItem => _isTargetShown(stepItem.target)));
  }, [steps]);

  // The card's size decides where it fits, and changes with each step's text. Resize observers report before
  // the frame is painted, so it never shows in the wrong place.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) {
      return undefined;
    }
    const resizeObserver = new ResizeObserver(() => setCardSize({ width: card.offsetWidth, height: card.offsetHeight }));
    resizeObserver.observe(card);
    return () => resizeObserver.disconnect();
  }, [isOn]);

  // Nothing behind the tour can be reached, keyboard included. The tour itself is portalled outside #root.
  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!isOn || !appRoot) {
      return undefined;
    }
    appRoot.inert = true;
    return () => {
      appRoot.inert = false;
    };
  }, [isOn]);

  useEffect(() => {
    nextButtonRef.current?.focus();
  }, [stepIndex, isOn]);

  const goNext = () => (isLastStep ? onFinish() : setStepIndex(stepIndex + 1));
  const goBack = () => setStepIndex(Math.max(0, stepIndex - 1));

  if (!step) {
    return null;
  }

  const cardPosition = spotlight
    ? getCardPosition(spotlight, cardSize, { width: window.innerWidth, height: window.innerHeight })
    : null;

  return createPortal(
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='spotlight-tour-title'
      aria-describedby='spotlight-tour-body'
      data-component='spotlight-tour'
      data-step={step.id}
      className='fixed inset-0 z-[60]'
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onFinish();
        } else if (event.key === 'ArrowRight') {
          goNext();
        } else if (event.key === 'ArrowLeft') {
          goBack();
        }
      }}
    >
      {/* The dim: one huge shadow around the spotlight's box, so the element itself stays clear. It glides from
          step to step. The whole layer swallows the pointer, so nothing under it can be clicked. */}
      {spotlight && (
        <div
          aria-hidden='true'
          className='pointer-events-none absolute rounded-xl shadow-[0_0_0_9999px_var(--spotlight-scrim)] ring-2 ring-brand-light transition-all duration-300 ease-out motion-reduce:transition-none'
          style={spotlight}
        />
      )}

      <div
        ref={cardRef}
        data-section='spotlight-card'
        className='absolute w-[min(340px,calc(100vw-32px))] rounded-2xl border bg-popover p-5 text-popover-foreground shadow-xl transition-[top,left,opacity] duration-300 ease-out motion-reduce:transition-none'
        style={cardPosition ? cardPosition : { top: 0, left: 0, opacity: 0 }}
      >
        <p className='text-xs font-medium text-muted-foreground'>
          {t('tour_progress', { current: stepIndex + 1, total: _.size(shownSteps) })}
        </p>
        <h2 id='spotlight-tour-title' className='mt-1 font-heading text-lg font-bold tracking-[-0.01em]'>{t(step.titleKey)}</h2>
        <p id='spotlight-tour-body' className='mt-1.5 text-sm text-muted-foreground'>{t(step.bodyKey)}</p>
        <div className='mt-5 flex items-center gap-2'>
          {!isLastStep && (
            <Button variant='ghost' size='sm' data-action='skip-tour' className='-ml-2' onClick={onFinish}>
              {t('tour_skip')}
            </Button>
          )}
          <div className='ml-auto flex items-center gap-2'>
            {stepIndex > 0 && (
              <Button variant='outline' size='sm' data-action='tour-back' onClick={goBack}>{t('tour_back')}</Button>
            )}
            <Button ref={nextButtonRef} size='sm' data-action={isLastStep ? 'finish-tour' : 'tour-next'} onClick={goNext}>
              {isLastStep ? t('tour_done') : t('tour_next')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type { SpotlightStep };
