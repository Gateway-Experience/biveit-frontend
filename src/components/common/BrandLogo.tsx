import { cn } from 'cn';

import logoDarkUrl from 'src/assets/brand/biveit-logo-dark.png';
import logoUrl from 'src/assets/brand/biveit-logo.png';
import wordmarkDarkUrl from 'src/assets/brand/biveit-wordmark-dark.png';
import wordmarkUrl from 'src/assets/brand/biveit-wordmark.png';
import { APP_NAME } from 'src/utils/constants';

// [Pure] Both colour versions of one image; CSS shows the right one for the theme (`dark:` skips force-light
// pages like the public pricing and policy pages, so those always get the light version).
function _renderThemedImage(lightUrl: string, darkUrl: string, className: string, options: { dataComponent?: string } = {}) {
  return (
    <>
      <img src={lightUrl} alt='' aria-hidden='true' draggable={false} data-component={options.dataComponent} className={cn(className, 'dark:hidden')} />
      <img src={darkUrl} alt='' aria-hidden='true' draggable={false} className={cn(className, 'hidden dark:block')} />
    </>
  );
}

// Intentions: the brand artwork (the "biveit lime & lavender" set): a "V" with a navy left/bottom arm and a
// lavender upper-right arm, and an all-lowercase "biveit" wordmark ("bive" navy, "it" lavender). In the dark
// theme the navy parts are lime instead (the set's original colours), since navy vanishes on a dark page.
// Raster exports of the chosen design, trimmed to their edges and saved at ~4× their on-screen size so they
// stay sharp on retina screens. The favicons in public/favicons come from the same set (lime version).
function BrandMark({ className }: { className?: string }) {
  return _renderThemedImage(logoUrl, logoDarkUrl, cn('h-9 w-auto shrink-0', className));
}

// Mark + wordmark. `hasWordmark={false}` gives just the mark. Screen readers get the name from APP_NAME.
export default function BrandLogo({ className, markClassName, hasWordmark = true }: {
  className?: string;
  markClassName?: string;
  hasWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} role='img' aria-label={APP_NAME}>
      <BrandMark className={markClassName} />
      {hasWordmark && (
        _renderThemedImage(wordmarkUrl, wordmarkDarkUrl, 'h-6 w-auto shrink-0', { dataComponent: 'wordmark' })
      )}
    </span>
  );
}

// The wordmark on its own, sized by its line of text (in em), for putting the name inside a sentence or heading
// ("Log in to biveit"). It sits on the text's baseline; "biveit" has no descenders, so the image's bottom edge
// is the letters' baseline. Read out as the name.
// `isOnDark`: always the dark-background version, whatever the theme, for surfaces that are dark in both
// (e.g. the welcome show's stage).
function BrandWordmark({ className, isOnDark = false }: { className?: string; isOnDark?: boolean }) {
  return (
    <span role='img' aria-label={APP_NAME} className={cn('inline-flex h-[0.74em] align-baseline', className)}>
      {isOnDark
        ? <img src={wordmarkDarkUrl} alt='' aria-hidden='true' draggable={false} className='h-full w-auto' />
        : _renderThemedImage(wordmarkUrl, wordmarkDarkUrl, 'h-full w-auto')}
    </span>
  );
}

export { BrandMark, BrandWordmark };
