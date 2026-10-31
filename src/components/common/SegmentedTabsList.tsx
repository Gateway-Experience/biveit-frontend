import type { ReactNode } from 'react';
import _ from 'lodash';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from 'cn';

import { TabsList, TabsTrigger } from 'src/components/shadui/tabs';

// Intentions: a segmented tab bar for narrow screens: the tabs sit in a soft rounded track, the selected one in a
// raised pill that slides across to the next pick, with a small dot under it that stretches into a line as it
// travels and shrinks back to a dot when it arrives. The tabs themselves are the regular ones (keyboard, roles), so it
// goes inside `Tabs` like any TabsList.
// Both the pill and the dot are the tabs' own indicators, placed by the --active-tab-* variables the tabs keep up to
// date; the dot's stretch is its two ends moving at different times, the leading one first (`segmented-tabs-dot` in
// styles/index.css, which reads the direction of the switch). The dot is the theme's primary colour: lavender in
// light, lime in dark.
export default function SegmentedTabsList({ tabs, className }: {
  tabs: { value: string; label: ReactNode; dataProps?: Record<string, string | boolean | undefined> }[];
  className?: string;
}) {
  return (
    // pb-3: room under the track for the dot. The track is the `before:` layer, so the dot can sit outside it.
    <TabsList
      variant='line'
      data-component='segmented-tabs'
      className={cn(
        'relative isolate gap-0 p-1 pb-3 group-data-horizontal/tabs:h-auto',
        'before:absolute before:inset-x-0 before:top-0 before:bottom-2 before:-z-10 before:rounded-full before:bg-foreground/[0.07]',
        className,
      )}
    >
      <TabsPrimitive.Indicator
        className='absolute top-(--active-tab-top) left-(--active-tab-left) -z-10 h-(--active-tab-height) w-(--active-tab-width) rounded-full bg-card shadow-sm shadow-foreground/10 transition-[left,width] duration-200 ease-[cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:transition-none dark:bg-foreground/15'
      />
      <TabsPrimitive.Indicator
        className='segmented-tabs-dot absolute bottom-0 h-[5px] rounded-full bg-primary'
      />
      {_.map(tabs, tab => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          // transition-none, not the base tab's transition-all: animating the bold weight (a variable font) nudges the
          // label's width every frame, which keeps moving the pill's target and restarting its slide (the switch
          // stalled ~170ms), and a fading colour reads as lag. The label changes the moment it's tapped; only the pill
          // and dot move. touch-manipulation: a tap is a tap (no wait to see if it's a double-tap zoom).
          className='h-8 flex-none touch-manipulation rounded-full px-4 transition-none after:hidden data-active:font-semibold'
          {...tab.dataProps}
        >
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
