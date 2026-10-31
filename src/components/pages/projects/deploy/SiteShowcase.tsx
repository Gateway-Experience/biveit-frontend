import { useEffect, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { LockIcon } from 'lucide-react';

import { useMediaQuery } from 'src/utils/hooks';

// How fast the address bar types the made-up domain, and how long it waits first (the panel settling in).
const _TYPE_STEP_MS = 75;
const _TYPE_START_DELAY_MS = 500;

// [Pure] A plausible address for the site, made from its name: "Gấu gấu" -> "gaugau.com", accents and spaces gone.
// Only a picture of what's coming -- the real domain is picked in the launch dialog.
// NFD + dropping the combining marks rather than _.deburr, which only knows Latin-1 and misses e.g. Vietnamese "ấ".
function _toDomainGuess(projectName: string) {
  const unaccented = projectName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');
  const slug = unaccented.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${_.truncate(slug, { length: 18, omission: '' }) || 'yoursite'}.com`;
}

// Original purpose: the top of the Deploy tab's offer, before anything's launched -- a picture of what launching
// gets them: their own site in a browser window, at its own address, live.
// A slightly tilted browser frame holding the site's latest snapshot (or, before there's one, a sketch of a page in
// the brand colours), the address bar typing out a domain made from the project's name, and a lime "Live" sticker
// on the corner. People who prefer less motion get the address already typed.
// `pictureUrl`: the site's snapshot (services/project.getSitePreviewUrl), null when there isn't one yet.
export default function SiteShowcase({ projectName, pictureUrl, className }: { projectName: string; pictureUrl: string | null; className?: string }) {
  const { t } = useTranslation();
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const domain = _toDomainGuess(projectName);
  const [typedLength, setTypedLength] = useState(0);
  const shownLength = isReducedMotion ? domain.length : typedLength;

  useEffect(() => {
    if (isReducedMotion) {
      return;
    }
    let step = 0;
    let typingTimer = 0;
    const typeNext = () => {
      step += 1;
      setTypedLength(step);
      if (step < domain.length) {
        typingTimer = window.setTimeout(typeNext, _TYPE_STEP_MS);
      }
    };
    typingTimer = window.setTimeout(typeNext, _TYPE_START_DELAY_MS);
    return () => window.clearTimeout(typingTimer);
  }, [domain, isReducedMotion]);

  return (
    <div data-component='site-showcase' className={cn('relative w-full px-2 pt-2 pb-3', className)}>
      {/* A soft lavender glow behind the window, so it floats off the pane. */}
      <span aria-hidden='true' className='absolute inset-x-4 top-5 bottom-1 rounded-[2rem] bg-primary/30 blur-2xl' />
      <div className='relative -rotate-2 overflow-hidden rounded-2xl border bg-card shadow-xl shadow-brand-ink/10 transition-transform duration-500 hover:rotate-0'>
        <div className='flex items-center gap-2 border-b bg-muted/60 px-2.5 py-1.5'>
          <span aria-hidden='true' className='flex gap-1'>
            <span className='size-2 rounded-full bg-[#FF5F57]' />
            <span className='size-2 rounded-full bg-[#FEBC2E]' />
            <span className='size-2 rounded-full bg-[#28C840]' />
          </span>
          <span className='flex min-w-0 flex-1 items-center gap-1 rounded-md bg-card px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground'>
            <LockIcon className='size-3 shrink-0 text-brand-strong' />
            <span className='truncate font-medium text-foreground' aria-label={domain}>{domain.slice(0, shownLength)}</span>
            <span aria-hidden='true' className='-ml-1 h-3.5 w-px shrink-0 animate-pulse bg-foreground motion-reduce:hidden' />
          </span>
        </div>
        <div className='aspect-[16/10] bg-muted'>
          {pictureUrl
            ? <img src={pictureUrl} alt='' className='size-full object-cover object-top' draggable={false} />
            : <PageSketch />}
        </div>
      </div>
      <span className='absolute -top-1 -right-1 inline-flex rotate-6 items-center gap-1.5 rounded-full bg-brand-light px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.08em] text-brand-ink uppercase shadow-[0_0_14px_2px_color-mix(in_oklab,var(--brand-light)_60%,transparent)]'>
        <span aria-hidden='true' className='relative flex size-1.5'>
          <span className='absolute inline-flex size-full animate-ping rounded-full bg-brand-strong opacity-70 motion-reduce:animate-none dark:bg-brand-ink' />
          <span className='relative inline-flex size-1.5 rounded-full bg-brand-strong dark:bg-brand-ink' />
        </span>
        {t('deploy_showcase_live')}
      </span>
    </div>
  );
}

// [Pure] Stands in for the snapshot before there is one: the outline of a home page (nav, headline, a button, three
// cards), in the brand's lavender and lime, so the window never looks empty. Its lines are in the text colour, so they
// show in both themes.
function PageSketch() {
  return (
    <div aria-hidden='true' className='flex size-full flex-col gap-2 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--primary)_22%,var(--card)),var(--card)_60%)] p-3'>
      <div className='flex items-center justify-between'>
        <span className='h-2 w-12 rounded-full bg-foreground/70' />
        <span className='flex gap-1.5'>
          <span className='h-1.5 w-6 rounded-full bg-foreground/25' />
          <span className='h-1.5 w-6 rounded-full bg-foreground/25' />
          <span className='h-1.5 w-6 rounded-full bg-foreground/25' />
        </span>
      </div>
      <div className='mt-1 flex flex-col gap-1.5'>
        <span className='h-2.5 w-3/5 rounded-full bg-foreground/80' />
        <span className='h-2.5 w-2/5 rounded-full bg-foreground/80' />
        <span className='mt-1 h-1.5 w-1/2 rounded-full bg-foreground/25' />
        <span className='mt-1.5 h-3.5 w-14 rounded-full bg-brand-light' />
      </div>
      <div className='mt-auto grid grid-cols-3 gap-2'>
        <span className='h-6 rounded-md bg-primary/35' />
        <span className='h-6 rounded-md bg-brand-light/50' />
        <span className='h-6 rounded-md bg-primary/35' />
      </div>
    </div>
  );
}
