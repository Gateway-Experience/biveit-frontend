import { useEffect, useState } from 'react';
import _ from 'lodash';

import { getDevenvStatus } from 'src/services/devenv';
import type { DevenvStatus } from 'src/types/preview';

// Intentions: the conversation's dev environment status, re-read whenever `refreshKey` moves (the stream
// nudged us, it reconnected, the project was just opened...). null = not known yet; a failed re-read
// keeps whatever we had.
export default function useDevenvStatus(conversationId: number | null, refreshKey: number) {
  const [devenv, setDevenv] = useState<DevenvStatus | null>(null);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    // Nudges can come in bursts; only the latest read may land, or an older answer could arrive last.
    let isStale = false;
    getDevenvStatus(conversationId)
      .then(fetchedDevenv => !isStale && setDevenv(fetchedDevenv))
      .catch(_.noop);
    return () => {
      isStale = true;
    };
  }, [conversationId, refreshKey]);

  return { devenv };
}
