import type { ComponentType, ReactNode } from 'react';
import _ from 'lodash';
import { cn } from 'cn';

import { TabsList, TabsTrigger } from 'src/components/shadui/tabs';

// Each pill after the first slides this far under the one before it. Its hidden left end is square, so its top and
// bottom edges run straight on under the pill in front (a rounded end would peek out as a notch above and below).
// Its label starts a bit closer to the front pill's edge than the usual padding: it also shows above and below that
// pill's round end, which reads as extra room.
const _OVERLAP_CLASS = '-ml-5 rounded-l-none pl-9';

// Intentions: a tab bar of overlapping pills: each tab a plain pill tucked under the one to its left, with a soft
// shadow along its right edge so the stack reads, and the selected one in the selection colour, like the sidebar's
// current page (`pill-tabs` in styles/index.css). The tabs are
// the regular ones (keyboard, roles), so it goes inside `Tabs` like any TabsList.
// Earlier pills sit on top (z-index counts down), so each one's shadow falls on the next.
export default function PillTabsList({ tabs, className }: {
  // `Icon`, if given, goes before the label. `dataProps`: extra data-* attributes for the tab, for debugging/tests.
  tabs: {
    value: string;
    label: ReactNode;
    Icon?: ComponentType<{ className?: string }>;
    dataProps?: Record<string, string | boolean | undefined>;
  }[];
  className?: string;
}) {
  return (
    <TabsList data-component='pill-tabs' className={cn('gap-0 bg-transparent p-0 group-data-horizontal/tabs:h-auto', className)}>
      {_.map(tabs, ({ value, label, Icon, dataProps }, index) => (
        <TabsTrigger
          key={value}
          value={value}
          style={{ zIndex: _.size(tabs) - index }}
          {...dataProps}
          className={cn(
            'h-9 flex-none gap-2 rounded-full border-0 bg-card px-5 text-muted-foreground transition-colors',
            'shadow-[6px_0_14px_-6px_color-mix(in_oklab,var(--foreground)_22%,transparent)]',
            'hover:text-foreground data-active:font-semibold data-active:text-selection-foreground',
            // Dark theme: the card's navy is lifted towards the text colour, or it'd vanish into the dark panel. Mixed (not
            // see-through), since the pill tucked under it mustn't show through.
            'dark:bg-[color-mix(in_oklab,var(--card),var(--foreground)_14%)] dark:data-active:border-0 dark:data-active:text-selection-foreground',
            // Hovering the selected one keeps its text, rather than the hover's (light in the dark theme, unreadable on lime).
            'data-active:hover:text-selection-foreground dark:data-active:hover:text-selection-foreground',
            index > 0 && _OVERLAP_CLASS,
          )}
        >
          {Icon && <Icon className='size-4' />}
          {/* Without an icon, the same least width for every label, centred, so a short word doesn't make a
              smaller-looking pill. With one it'd just push the word away from its icon. */}
          <span className={cn('inline-flex items-center justify-center gap-1.5', !Icon && 'min-w-14')}>{label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
