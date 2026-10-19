import { Fragment, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { useInterval, useMediaQuery } from 'src/utils/hooks';
import type { ArtIcon } from 'src/types/landing';

export type OrbitBusiness = { id: string; labelKey: string; Icon: ArtIcon };

// How long each business holds the spotlight before the next one, until the visitor picks one.
const _SPOTLIGHT_MS = 1800;
// The two rings, as a share of the stage's width from its centre; the inner one holds this many icons.
const _INNER_RADIUS = 34;
const _OUTER_RADIUS = 44;
const _INNER_COUNT = 5;

// [Pure] Where the n-th of `count` icons sits on a ring of `radius` (% of the stage), as left/top percentages.
// `offset` turns the whole ring a bit (as a share of one step) so the two rings' icons don't line up.
function _getRingPosition(index: number, count: number, radius: number, offset: number) {
  const angle = ((index + offset) / count) * Math.PI * 2 - Math.PI / 2;
  return { left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%` };
}

// Original purpose: the landing page's "made for whatever you run".
// Intentions: instead of a list of tags, the businesses circle the page's question like planets: two rings of
// icons turning slowly in opposite directions (each icon counter-turns so it stays upright), and in the middle
// the business in the spotlight, its name set large in the slogan's font. The spotlight hops from one to the
// next on its own, lighting up its icon on the ring; clicking an icon puts that one in the spotlight and stops
// the hopping. Hovering the stage pauses the rings. With reduced motion on, nothing turns or hops by itself.
// `title` is the section's heading, shown above the name in the middle.
export default function BusinessOrbit({ businesses, title }: { businesses: OrbitBusiness[]; title: string }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasPicked, setHasPicked] = useState(false);
  useInterval(() => setActiveIndex(previous => (previous + 1) % _.size(businesses)), hasPicked || prefersReducedMotion ? null : _SPOTLIGHT_MS);

  const activeBusiness = businesses[activeIndex];
  const rings = [
    { id: 'inner', radius: _INNER_RADIUS, offset: 0, isReversed: false, members: _.take(businesses, _INNER_COUNT), firstIndex: 0 },
    { id: 'outer', radius: _OUTER_RADIUS, offset: 0.5, isReversed: true, members: _.drop(businesses, _INNER_COUNT), firstIndex: _INNER_COUNT },
  ];
  // Paused while hovering, so an icon holds still long enough to be clicked.
  const spinClass = 'animate-orbit group-hover/orbit:[animation-play-state:paused] motion-reduce:animate-none';

  return (
    // The turning rings are square boxes whose corners swing out past the stage, hence the clip.
    <div data-component='business-orbit' className='group/orbit relative mx-auto aspect-square w-full max-w-[560px] overflow-clip [overflow-clip-margin:2rem]'>
      {rings.map(ring => (
        <Fragment key={ring.id}>
          {/* The ring's track. */}
          <div aria-hidden='true' className='absolute rounded-full border border-dashed border-brand-strong/20' style={{ inset: `${50 - ring.radius}%` }} />
          <div className={cn('absolute inset-0', spinClass)} style={{ animationDirection: ring.isReversed ? 'reverse' : 'normal' }}>
            {ring.members.map((business, memberIndex) => {
              const index = ring.firstIndex + memberIndex;
              const isActive = index === activeIndex;
              return (
                <div key={business.id} className='absolute -translate-1/2' style={_getRingPosition(memberIndex, _.size(ring.members), ring.radius, ring.offset)}>
                  {/* Turns against the ring, so the icon stays upright. */}
                  <div className={spinClass} style={{ animationDirection: ring.isReversed ? 'normal' : 'reverse' }}>
                    <button
                      type='button'
                      data-businessid={business.id}
                      aria-label={t(business.labelKey)}
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveIndex(index);
                        setHasPicked(true);
                      }}
                      className={cn(
                        'grid size-10 cursor-pointer place-items-center rounded-full border bg-card text-brand-strong shadow-sm transition-all duration-500 hover:scale-110 sm:size-12',
                        isActive && 'scale-125 border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:scale-125',
                      )}
                    >
                      <business.Icon className='size-4.5 sm:size-5' strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Fragment>
      ))}

      {/* The middle: the question, and the business in the spotlight (keyed, so each one slides in fresh). */}
      <div className='absolute inset-[25%] grid place-items-center rounded-full border bg-card/85 p-4 text-center shadow-xl shadow-brand-strong/10 backdrop-blur-sm'>
        <div className='flex flex-col items-center gap-2'>
          <h2 className='text-xs font-semibold text-muted-foreground sm:text-sm'>{title}</h2>
          <activeBusiness.Icon key={`${activeBusiness.id}-icon`} className='size-6 animate-in text-brand-strong duration-500 zoom-in-50 fade-in-0' strokeWidth={1.5} />
          <p key={activeBusiness.id} aria-live='polite' className='animate-in font-display text-xl leading-tight font-extrabold tracking-[-0.02em] text-balance duration-500 fade-in-0 slide-in-from-bottom-3 sm:text-3xl'>
            {t(activeBusiness.labelKey)}
          </p>
        </div>
      </div>
    </div>
  );
}
