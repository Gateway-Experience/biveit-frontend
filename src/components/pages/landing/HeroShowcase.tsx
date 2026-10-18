import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { LockIcon } from 'lucide-react';
import { cn } from 'cn';

import ScaledFrame from 'src/components/common/ScaledFrame';
import { BrowserDots } from 'src/components/pages/landing/ProductSnippets';
import { useInterval, useMediaQuery, useScrollProgress } from 'src/utils/hooks';

export type ShowcaseSite = { id: string; domainKey: string; typeKey: string; Site: () => React.ReactNode };

// How long each example site shows before the next one, until the visitor picks one themselves.
const _ROTATE_MS = 5000;
// The tilt at the start (degrees back), flattened out as the hero scrolls away.
const _START_TILT = 18;
// The most the window leans toward the pointer, either way (degrees).
const _POINTER_LEAN = 4;

// Original purpose: the landing hero's big picture (after the Clear Street reference the user picked).
// Intentions: one large, real-looking website in a browser window: what you'd get. It starts tilted back
// like a product shot and lies flat as you scroll into the page, leans a little toward the pointer, and the
// tabs in its address bar switch between example sites (a bike rental, a hotel, a café...), cycling on
// their own until the visitor picks one. The sites are live markup (ExampleSites), so they stay crisp at
// any size. With reduced motion on: flat, still, no cycling.
export default function HeroShowcase({ sites, className }: { sites: ShowcaseSite[]; className?: string }) {
  const { t } = useTranslation();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [ref, scrollProgress] = useScrollProgress<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasPicked, setHasPicked] = useState(false);
  // Where the pointer is over the window, -1..1 each way; null when it isn't.
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  useInterval(() => setActiveIndex(previous => (previous + 1) % _.size(sites)), hasPicked || prefersReducedMotion ? null : _ROTATE_MS);

  const activeSite = sites[activeIndex];
  // Flat by the time the window's top has scrolled halfway up the screen.
  const tilt = prefersReducedMotion ? 0 : _START_TILT * (1 - _.clamp(scrollProgress * 2, 0, 1));
  const leanX = prefersReducedMotion || !pointer ? 0 : -pointer.y * _POINTER_LEAN;
  const leanY = prefersReducedMotion || !pointer ? 0 : pointer.x * _POINTER_LEAN;

  const followPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({ x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: ((event.clientY - rect.top) / rect.height) * 2 - 1 });
  };

  return (
    <div ref={ref} data-component='hero-showcase' className={cn('[perspective:2000px]', className)}>
      <div
        onPointerMove={followPointer}
        onPointerLeave={() => setPointer(null)}
        className='origin-top overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-brand-strong/15 transition-transform duration-300 ease-out will-change-transform'
        style={{ transform: `rotateX(${tilt + leanX}deg) rotateY(${leanY}deg)` }}
      >
        {/* The browser bar: dots, the example address, and the sites as tabs. */}
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-card px-4 py-2.5'>
          <BrowserDots />
          <span className='flex min-w-0 items-center gap-1.5 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground'>
            <LockIcon className='size-3 shrink-0 text-success' />
            <span className='truncate'>{t(activeSite.domainKey)}</span>
          </span>
          <div role='tablist' aria-label={t('landing_showcase_title')} className='ml-auto flex flex-wrap gap-1'>
            {sites.map((site, index) => (
              <button
                key={site.id}
                type='button'
                role='tab'
                aria-selected={index === activeIndex}
                data-siteid={site.id}
                onClick={() => {
                  setActiveIndex(index);
                  setHasPicked(true);
                }}
                className={cn(
                  'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  index === activeIndex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t(site.typeKey)}
              </button>
            ))}
          </div>
        </div>
        {/* Keyed by site so each one fades in fresh. */}
        <div key={activeSite.id} className='animate-in fade-in-0 duration-500'>
          <ScaledFrame baseWidth={640} baseHeight={400}>
            <activeSite.Site />
          </ScaledFrame>
        </div>
      </div>
    </div>
  );
}
