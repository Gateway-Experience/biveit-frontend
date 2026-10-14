import { cn } from 'cn';

// Intentions: the app's loading spinner — a continuous ring (a faint full circle with a turning arc), in place
// of the theme's segmented one (shadui/spinner, which follows the preset's icon set and isn't ours to edit).
// Same API as that one: size it with `size-*`, colour it with `text-*`; inside a Button it takes
// `data-icon` like any icon.
// No translated label baked in: the app's startup screen (FullScreenLoading) shows it before i18n is even
// set up. `role=status` already announces it; pass `aria-label` where a spoken label is worth having.
export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2.5}
      strokeLinecap='round'
      data-slot='spinner'
      role='status'
      className={cn('size-4 animate-spin', className)}
      {...props}
    >
      <circle cx='12' cy='12' r='9.5' className='opacity-20' />
      {/* A quarter of the ring, from 12 o'clock to 3 o'clock. */}
      <path d='M12 2.5a9.5 9.5 0 0 1 9.5 9.5' />
    </svg>
  );
}
