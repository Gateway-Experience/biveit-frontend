import { useId } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

import { APP_NAME } from 'src/utils/constants';

// Intentions: the brand mark. A folded ribbon "V" (as in VibeIt) whose long right stroke doubles as a check
// mark ("vibe it, done"), and a spark for the AI doing the work. The gradients (light → brand → deep) give it
// the folded-ribbon depth. Drawn with theme tokens; the favicon copy (public/logo.svg, src/assets/logo.svg,
// and the .ico/.png made from it) is the same shapes in light-theme colors.
// The viewBox is square and centred on the shapes, so the mark sits right in an icon-sized box too.
function BrandMark({ className }: { className?: string }) {
  // Gradient ids must be unique per instance, since the mark can appear more than once on a page.
  const gradientId = useId().replace(/[^a-zA-Z0-9-]/g, '');
  return (
    <svg viewBox='1 -2 46 46' aria-hidden='true' className={cn('h-9 w-auto shrink-0', className)}>
      <defs>
        <linearGradient id={`${gradientId}-left`} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' style={{ stopColor: 'var(--brand-light)' }} />
          <stop offset='1' style={{ stopColor: 'var(--brand-strong)' }} />
        </linearGradient>
        <linearGradient id={`${gradientId}-right`} x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0' style={{ stopColor: 'var(--brand-deep)' }} />
          <stop offset='1' style={{ stopColor: 'var(--brand-strong)' }} />
        </linearGradient>
      </defs>
      <path d='M5 13.5Q3.5 9 8 9H13Q16 9 17.3 11.7L25 27.5L20.5 37Q19.5 39 17.8 37.2Z' fill={`url(#${gradientId}-left)`} />
      <path d='M17.8 37.2Q19.5 39.6 21.6 39.6H24.4Q27.2 39.6 28.6 37L41.8 12.2Q43.5 9 40 9H36.6Q34 9 32.7 11.4Z' fill={`url(#${gradientId}-right)`} />
      <path d='M41 1.5L42.2 4.8L45.5 6L42.2 7.2L41 10.5L39.8 7.2L36.5 6L39.8 4.8Z' fill='var(--brand-light)' />
    </svg>
  );
}

// How many of APP_NAME's last letters the wordmark colours in the brand colour: "Vibe" + "It".
const _WORDMARK_ACCENT_LENGTH = 2;

// In the heading font a capital I is a bare bar, the same as a lowercase l, so "VibeIt" read as "Vibelt".
// The wordmark's I gets small serifs (two bars drawn in the text colour, sized in em so they scale with
// the type) to make it unmistakably an I.
const _SERIFED_I_CLASS = cn(
  'relative mx-[0.05em] inline-block',
  'before:absolute before:inset-x-[-0.08em] before:top-[0.15em] before:h-[0.09em] before:rounded-[1px] before:bg-current before:content-[""]',
  'after:absolute after:inset-x-[-0.08em] after:bottom-[0.1em] after:h-[0.09em] after:rounded-[1px] after:bg-current after:content-[""]',
);

// Mark + "VibeIt" wordmark (with "It" in the brand colour). The wordmark is real text so it stays sharp, and
// the name only lives in APP_NAME. `hasWordmark={false}` gives just the mark.
export default function BrandLogo({ className, markClassName, hasWordmark = true }: {
  className?: string;
  markClassName?: string;
  hasWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)} aria-label={APP_NAME}>
      <BrandMark className={markClassName} />
      {hasWordmark && (
        <span aria-hidden='true' className='font-heading text-[1.45rem] leading-none font-bold tracking-[-0.04em]'>
          {APP_NAME.slice(0, -_WORDMARK_ACCENT_LENGTH)}
          <span className='text-brand-strong'>
            {_.map(APP_NAME.slice(-_WORDMARK_ACCENT_LENGTH), (letter, index) => (
              letter === 'I' ? <span key={index} className={_SERIFED_I_CLASS}>{letter}</span> : letter
            ))}
          </span>
        </span>
      )}
    </span>
  );
}

export { BrandMark };
