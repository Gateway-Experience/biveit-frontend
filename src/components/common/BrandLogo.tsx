import { useId } from 'react';
import { cn } from 'cn';

import { APP_NAME } from 'src/utils/constants';

// Intentions: the brand mark, "V3". A folded ribbon "V" whose long right stroke doubles as a check mark
// ("you say it, it's done"), then a "3" drawn as one rounded ribbon stroke, with a small spark for the
// AI. The gradients (light → brand → deep) give it the folded-ribbon depth. Drawn with theme tokens; the
// square favicon (public/logo.svg, src/assets/logo.svg) keeps just the "V", in light-theme colors.
function BrandMark({ className }: { className?: string }) {
  // Gradient ids must be unique per instance, since the mark can appear more than once on a page.
  const gradientId = useId().replace(/[^a-zA-Z0-9-]/g, '');
  return (
    <svg viewBox='0 0 80 48' aria-hidden='true' className={cn('h-9 w-auto shrink-0', className)}>
      <defs>
        <linearGradient id={`${gradientId}-left`} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' style={{ stopColor: 'var(--brand-light)' }} />
          <stop offset='1' style={{ stopColor: 'var(--primary)' }} />
        </linearGradient>
        <linearGradient id={`${gradientId}-right`} x1='0' y1='1' x2='1' y2='0'>
          <stop offset='0' style={{ stopColor: 'var(--brand-deep)' }} />
          <stop offset='1' style={{ stopColor: 'var(--primary)' }} />
        </linearGradient>
      </defs>
      <path d='M5 13.5Q3.5 9 8 9H13Q16 9 17.3 11.7L25 27.5L20.5 37Q19.5 39 17.8 37.2Z' fill={`url(#${gradientId}-left)`} />
      <path d='M17.8 37.2Q19.5 39.6 21.6 39.6H24.4Q27.2 39.6 28.6 37L41.8 12.2Q43.5 9 40 9H36.6Q34 9 32.7 11.4Z' fill={`url(#${gradientId}-right)`} />
      <path
        d='M50.5 12.5H67L57.5 22.8Q71.5 22.4 71.5 31.6Q71.5 40.6 60.5 40.6Q53.6 40.6 50 36.2'
        fill='none'
        stroke={`url(#${gradientId}-right)`}
        strokeWidth={7.5}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path d='M75 1.5L76.2 4.8L79.5 6L76.2 7.2L75 10.5L73.8 7.2L70.5 6L73.8 4.8Z' fill='var(--brand-light)' />
    </svg>
  );
}

// Mark + "Vib3" wordmark (with the "3" in brand purple). The wordmark is real text so it stays sharp,
// and the name only lives in APP_NAME. `hasWordmark={false}` gives just the mark.
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
          {APP_NAME.slice(0, -1)}
          <span className='text-primary'>{APP_NAME.slice(-1)}</span>
        </span>
      )}
    </span>
  );
}

export { BrandMark };
