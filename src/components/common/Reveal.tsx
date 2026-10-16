import { createElement } from 'react';
import { cn } from 'cn';

import { useHasBeenInView } from 'src/utils/hooks';

type RevealProps = React.HTMLAttributes<HTMLElement> & {
  // The element to render, so a revealed card can still be the `li` of its list.
  as?: 'div' | 'li' | 'section';
  // Wait this long after it scrolls into view. Give items in a row increasing delays to stagger them.
  delayMs?: number;
};

// Intentions: content that fades in and drifts up the first time it scrolls into view, so a long page
// unfolds as you scroll instead of showing everything at once. Runs once per element (scrolling back up
// doesn't hide it again). People who ask their OS for reduced motion just get the content, no animation.
// It's a CSS animation (tw-animate-css), not a transition, so the element's own hover transitions still work.
export default function Reveal({ as = 'div', delayMs = 0, className, style, children, ...rest }: RevealProps) {
  const [ref, hasBeenInView] = useHasBeenInView<HTMLElement>({ bottomOffset: '8%' });

  return createElement(as, {
    ...rest,
    ref,
    'data-revealed': hasBeenInView,
    style: { ...style, animationDelay: `${delayMs}ms` },
    className: cn(
      hasBeenInView
        ? 'animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out fill-mode-both motion-reduce:animate-none'
        : 'opacity-0 motion-reduce:opacity-100',
      className,
    ),
  }, children);
}
