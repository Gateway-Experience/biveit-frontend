import _ from 'lodash';
import { useTranslation } from 'react-i18next';

import ScaledFrame from 'src/components/common/ScaledFrame';
import { BrowserDots } from 'src/components/pages/landing/ProductSnippets';
import { useIsMobile, useMediaQuery, useScrollProgress } from 'src/utils/hooks';

export type ZoomSite = { id: string; domainKey: string; typeKey: string; descKey: string; Site: () => React.ReactNode };

// The zoom, start to end: a zoomed-out mosaic that ends a little past full size, so it feels like diving in.
const _SCALE_FROM = 0.5;
const _SCALE_TO = 1.12;
// The mosaic is three by three; with six sites, the first three come round again to fill it.
const _TILE_COUNT = 9;

function SiteCard({ site, hasCaption }: { site: ZoomSite; hasCaption: boolean }) {
  const { t } = useTranslation();
  return (
    <div data-siteid={site.id} className='overflow-hidden rounded-2xl border bg-background shadow-md'>
      <div className='flex items-center gap-3 border-b bg-card px-3 py-2'>
        <BrowserDots />
        <span className='truncate rounded-md bg-muted px-2 py-0.5 text-[0.6875rem] text-muted-foreground'>{t(site.domainKey)}</span>
      </div>
      <ScaledFrame baseWidth={640} baseHeight={400}>
        <site.Site />
      </ScaledFrame>
      {hasCaption && (
        <div className='p-5'>
          <p className='text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t(site.typeKey)}</p>
          <p className='mt-1.5 font-medium'>{t(site.descKey)}</p>
        </div>
      )}
    </div>
  );
}

// Original purpose: the landing page's "what could yours look like" (after the Ingamana reference).
// Intentions: the example sites as a mosaic that zooms in as you scroll through the section: it starts
// zoomed out, showing them all at a glance, and dives in until the middle ones fill the screen, while the
// heading fades to give them the stage. The section is extra tall and its inside sticks to the screen
// meanwhile, so the scroll drives the zoom. On phones and with reduced motion it's a plain grid.
// `heading` is the section's title block, rendered above.
export default function ShowcaseZoom({ sites, heading }: { sites: ZoomSite[]; heading: React.ReactNode }) {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [ref, progress] = useScrollProgress<HTMLElement>({ mode: 'pinned' });

  if (isMobile || prefersReducedMotion) {
    return (
      <section data-section='showcase' className='border-y bg-card px-4 py-20'>
        {heading}
        <div className='mt-12 grid gap-5'>
          {sites.map(site => <SiteCard key={site.id} site={site} hasCaption />)}
        </div>
      </section>
    );
  }

  const scale = _SCALE_FROM + (_SCALE_TO - _SCALE_FROM) * progress;
  // The heading has the screen to itself at first, then fades as the zoom gets going.
  const headingOpacity = 1 - _.clamp((progress - 0.15) / 0.3, 0, 1);
  const tiles = _.times(_TILE_COUNT, index => sites[index % _.size(sites)]);

  return (
    <section ref={ref} data-section='showcase' data-progress={progress.toFixed(2)} className='relative h-[260vh] border-y bg-card'>
      {/* Stuck below the sticky header (4rem) while the section scrolls past. */}
      <div className='sticky top-16 flex h-[calc(100svh-4rem)] flex-col overflow-hidden'>
        <div className='relative z-10 px-4 pt-14' style={{ opacity: headingOpacity }}>{heading}</div>
        <div className='absolute inset-0 grid place-items-center'>
          <div
            className='grid w-[min(1200px,92vw)] grid-cols-3 gap-6 will-change-transform'
            // Starts a little below centre (under the heading) and settles into the middle as it zooms.
            style={{ transform: `translateY(${(1 - progress) * 9}vh) scale(${scale})` }}
          >
            {tiles.map((site, index) => <SiteCard key={`${site.id}-${index}`} site={site} hasCaption={false} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
