import { cn } from 'cn';

// Intentions: lucide has no perfume icon, so this one is drawn in the same style (24 grid, round
// stroke, currentColor) to sit next to lucide icons without looking out of place. Extra svg props
// (x, y, width, color...) pass through, so it can also be dropped inside a bigger <svg> like lucide's.
export default function PerfumeBottleIcon({ className, strokeWidth = 2, ...svgProps }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      {...svgProps}
      strokeWidth={strokeWidth}
      className={cn('size-6', className)}
    >
      {/* Cap, neck, bottle, label */}
      <rect x='8' y='2' width='6' height='4' rx='1' />
      <path d='M9.5 6v3M12.5 6v3' />
      <rect x='4' y='9' width='14' height='13' rx='4' />
      <path d='M8 15.5h6' />
      {/* Spritz */}
      <path d='M17 4h3M17 2.5l2.5-1M17 5.5l2.5 1' />
    </svg>
  );
}
