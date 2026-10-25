import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CoffeeIcon, HourglassIcon } from 'lucide-react';

import { useInterval } from 'src/utils/hooks';

// How many `chat_wait_<kind>_<n>` lines there are of each, in i18nMappings, and how long each one stays up.
const _WAIT_LINE_COUNTS = { short: 10, long: 10 };
const _WAIT_LINE_SECONDS = 12;

// [Pure-ish] Which line shows now: read off the clock, so every line gets its turn and a re-mount doesn't
// restart from the first one.
function _getLineIndex(kind: keyof typeof _WAIT_LINE_COUNTS) {
  return Math.floor(Date.now() / 1000 / _WAIT_LINE_SECONDS) % _WAIT_LINE_COUNTS[kind];
}

// Intentions: a calm line above the chat input while the agent is busy, so the wait feels looked after
// rather than stuck. Short, "thinking" lines while it's replying; longer "go take a break" ones while it's
// building the site, which takes minutes. A new line every few seconds, fading in.
// References: fourpixie-frontend components/pages/projects/pipeline/JobProgress.tsx (same lines, for games)
export default function AgentWaitLine({ isBuilding, className }: { isBuilding: boolean; className?: string }) {
  const { t } = useTranslation();
  const kind = isBuilding ? 'long' : 'short';
  // Re-renders every second so the clock can move to the next line; which one shows is read off the clock.
  const [, setTick] = useState(0);
  useInterval(() => setTick(tick => tick + 1), 1000);
  const shownIndex = _getLineIndex(kind);
  const WaitIcon = isBuilding ? CoffeeIcon : HourglassIcon;

  return (
    <p
      key={`${kind}-${shownIndex}`}
      role='status'
      data-waitline={`${kind}_${shownIndex + 1}`}
      className={cn('mb-2 flex items-center justify-start gap-2 text-left text-sm text-muted-foreground animate-in fade-in-0 duration-700', className)}
    >
      <WaitIcon className='size-4 shrink-0 text-primary' />
      {t(`chat_wait_${kind}_${shownIndex + 1}`)}
    </p>
  );
}
