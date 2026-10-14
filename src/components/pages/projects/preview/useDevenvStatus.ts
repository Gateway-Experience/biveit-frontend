import { useEffect, useState } from 'react';
import _ from 'lodash';

import { getActiveBuild, getDevenvStatus } from 'src/services/devenv';
import type { DevenvStatus } from 'src/types/preview';

// Intentions: the conversation's dev environment status, re-read whenever `refreshKey` moves (the stream
// nudged us, it reconnected, the project was just opened...). null = not known yet; a failed re-read
// keeps whatever we had.
// Also the build in progress (`activeBuild`). A build switches itself off at its `until` without telling
// anyone, so the clock it's judged by is moved on when that time comes, which drops it.
export default function useDevenvStatus(conversationId: number | null, refreshKey: number) {
  const [devenv, setDevenv] = useState<DevenvStatus | null>(null);
  // When we last looked: on every read, and at the current build's expiry.
  const [checkedAtMs, setCheckedAtMs] = useState(0);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    // Nudges can come in bursts; only the latest read may land, or an older answer could arrive last.
    let isStale = false;
    getDevenvStatus(conversationId)
      .then(fetchedDevenv => {
        if (!isStale) {
          setDevenv(fetchedDevenv);
          setCheckedAtMs(Date.now());
        }
      })
      .catch(_.noop);
    return () => {
      isStale = true;
    };
  }, [conversationId, refreshKey]);

  const buildUntil = devenv?.building?.until;
  useEffect(() => {
    if (!buildUntil) {
      return;
    }
    // A little past it, so the check lands on the far side.
    const timer = setTimeout(() => setCheckedAtMs(Date.now()), Math.max(0, Date.parse(buildUntil) - Date.now()) + 100);
    return () => clearTimeout(timer);
  }, [buildUntil]);

  return { devenv, activeBuild: getActiveBuild(devenv, checkedAtMs) };
}
