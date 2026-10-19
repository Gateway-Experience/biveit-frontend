import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import ScaledFrame from 'src/components/common/ScaledFrame';
import { BrowserDots } from 'src/components/pages/landing/ProductSnippets';
import { useHasBeenInView, useInterval, useMediaQuery } from 'src/utils/hooks';

export type ZoomSite = { id: string; domainKey: string; typeKey: string; descKey: string; Site: () => React.ReactNode };

// How long each card stays zoomed in before the next one takes over.
const _ZOOM_MS = 2200;

// One example site in a browser frame with its caption. When it's the zoomed one, the card lifts forward and
// the site inside zooms in a little too.
function SiteCard({ site, isZoomed, onPointerEnter }: { site: ZoomSite; isZoomed: boolean; onPointerEnter: (event: React.PointerEvent) => void }) {
  const { t } = useTranslation();
  return (
    <div
      data-siteid={site.id}
      data-zoomed={isZoomed}
      onPointerEnter={onPointerEnter}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-background shadow-md transition-all duration-700 ease-out',
        isZoomed && 'z-10 scale-[1.06] shadow-2xl shadow-brand-strong/20',
      )}
    >
      <div className='flex items-center gap-3 border-b bg-card px-3 py-2'>
        <BrowserDots />
        <span className='truncate rounded-md bg-muted px-2 py-0.5 text-[0.6875rem] text-muted-foreground'>{t(site.domainKey)}</span>
      </div>
      <div className='overflow-hidden'>
        <div className={cn('transition-transform duration-700 ease-out', isZoomed && 'scale-110')}>
          <ScaledFrame baseWidth={640} baseHeight={400}>
            <site.Site />
          </ScaledFrame>
        </div>
      </div>
      <div className='flex-1 bg-card p-5'>
        <p className='text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t(site.typeKey)}</p>
        <p className='mt-1.5 font-medium'>{t(site.descKey)}</p>
      </div>
    </div>
  );
}

// Original purpose: the landing page's "what could yours look like" (after the Ingamana reference).
// Intentions: the example sites as a plain grid that scrolls normally; once it's on screen, the cards take
// turns zooming in on their own, one after another, round and round. Pointing at a card zooms that one and
// holds it there; leaving the grid lets the turns carry on from it. With reduced motion on, nothing zooms
// by itself. `heading` is the section's title block, rendered above; `footer` (optional) goes under the grid.
export default function ShowcaseZoom({ sites, heading, footer }: { sites: ZoomSite[]; heading: React.ReactNode; footer?: React.ReactNode }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [gridRef, hasBeenInView] = useHasBeenInView<HTMLDivElement>({ bottomOffset: '30%' });
  // null until the grid first comes into view, so the first card's zoom is actually seen.
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const isCycling = hasBeenInView && !isPointerInside && !prefersReducedMotion;
  useInterval(() => setZoomedIndex(previous => ((previous ?? -1) + 1) % _.size(sites)), isCycling ? _ZOOM_MS : null);

  return (
    <section data-section='showcase' className='border-y bg-card'>
      {/* Padding: the landing's section gap (SECTION_PAD_BOTTOM_CLASS in Landing), on top too since the border
          sits between it and the section above. With a footer (the start button), the bottom matches the gap
          above the button (mt-12) instead. */}
      <div className={cn('mx-auto w-full max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20', footer ? 'pb-12' : 'pb-14 sm:pb-20')}>
        {heading}
        <div
          ref={gridRef}
          onPointerLeave={() => setIsPointerInside(false)}
          className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
        >
          {sites.map((site, index) => (
            <SiteCard
              key={site.id}
              site={site}
              isZoomed={index === zoomedIndex}
              onPointerEnter={event => {
                // A tap on a phone never "leaves", so it would stop the turns for good: mouse/pen only.
                if (event.pointerType === 'touch') {
                  return;
                }
                setIsPointerInside(true);
                setZoomedIndex(index);
              }}
            />
          ))}
        </div>
        {footer}
      </div>
    </section>
  );
}
