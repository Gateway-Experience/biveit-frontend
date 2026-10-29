import type { ReactNode } from 'react';
import { cn } from 'cn';
import { ZapIcon } from 'lucide-react';

// Intentions: a little flag shaped like a real price tag (pointed end, a punched hole) in the brand lime, tilted a
// touch so it reads as stuck on -- for pointing out an offer, e.g. the Pricing page's "Best value".
// Brought back from the old launch-sale tag, which is where the look was settled.
// Always one line: where it doesn't fit beside a name, the row it sits in should wrap it onto a line of its own.
export default function PriceTagBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      data-component='price-tag-badge'
      className={cn(
        'relative inline-flex shrink-0 -rotate-3 items-center gap-1.5 rounded-r-md bg-brand-light py-1 pr-2.5 pl-4.5 text-brand-ink shadow-sm shadow-brand-deep/30',
        '[clip-path:polygon(10px_0,100%_0,100%_100%,10px_100%,0_50%)]',
        className,
      )}
    >
      <span aria-hidden='true' className='absolute top-1/2 left-2 size-1.5 -translate-y-1/2 rounded-full bg-brand-ink/30' />
      <ZapIcon aria-hidden='true' className='size-3 shrink-0 fill-current' />
      <span className='text-[0.6875rem] font-bold tracking-[0.06em] whitespace-nowrap uppercase'>{children}</span>
    </span>
  );
}
