import { cn } from 'cn';

import { useElementSize } from 'src/utils/hooks';

// Intentions: renders children on a fixed-size canvas (baseWidth x baseHeight, in px) and scales it down
// to whatever width the frame gets — like a screenshot of a UI, except it's live markup that stays crisp
// and follows the theme. Handy for device mockups (a site inside a laptop or phone screen).
// The canvas stays hidden until the frame has been measured, so it never flashes at full size.
export default function ScaledFrame({ baseWidth, baseHeight, className, children }: {
  baseWidth: number;
  baseHeight: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [setFrameElement, frameSize] = useElementSize<HTMLDivElement>();
  const scale = frameSize.width ? frameSize.width / baseWidth : 0;

  return (
    <div
      ref={setFrameElement}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: `${baseWidth} / ${baseHeight}` }}
    >
      <div
        className='absolute top-0 left-0 origin-top-left'
        style={{ width: baseWidth, height: baseHeight, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  );
}
