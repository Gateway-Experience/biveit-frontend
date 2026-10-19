import { useEffect, useMemo, useState } from 'react';

import { getActiveBuild } from 'src/services/chatLog';
import type { AiMessage } from 'src/types/chat';

// Intentions: the build in progress, read off the chat's messages (see getActiveBuild). A build ends by
// itself at its `until` without anything new arriving, so the clock it's judged by is moved on when that
// time comes, which drops it.
export default function useActiveBuild(messages: AiMessage[] | null) {
  // When we last looked: on mount, and at the current build's expiry. New messages re-judge on their own.
  const [checkedAtMs, setCheckedAtMs] = useState(() => Date.now());
  const activeBuild = useMemo(() => getActiveBuild(messages || [], checkedAtMs), [messages, checkedAtMs]);

  const buildUntil = activeBuild?.until;
  useEffect(() => {
    if (!buildUntil) {
      return;
    }
    // A little past it, so the check lands on the far side.
    const timer = setTimeout(() => setCheckedAtMs(Date.now()), Math.max(0, Date.parse(buildUntil) - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [buildUntil]);

  return activeBuild;
}
