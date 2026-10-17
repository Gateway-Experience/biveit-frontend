import { useEffect, useReducer, useState } from 'react';

import { openProject } from 'src/services/project';
import type { AgentSessionStatus } from 'src/types/chat';

// Intentions: opens the project for this visit (POST /projects/{id}/open) and tracks how that went. Open
// brings the agent's session up and, the very first time, hands it the bootstrap form's answers so it can
// greet the user — that first one takes 10-30s. It's safe to repeat (the BE hands the answers over exactly
// once), so `retry` simply calls it again.
// `onReady` must be stable (e.g. a dispatch): changing it re-opens.
export default function useProjectSession(projectId: number, options: { onReady?: () => void } = {}) {
  const { onReady } = options;
  const [status, setStatus] = useState<AgentSessionStatus>('opening');
  const [attemptCount, retry] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    let isCancelled = false;
    setStatus('opening');
    openProject(projectId)
      .then(() => {
        if (!isCancelled) {
          setStatus('ready');
          onReady?.();
        }
      })
      .catch(() => !isCancelled && setStatus('failed'));
    return () => {
      isCancelled = true;
    };
  }, [projectId, attemptCount, onReady]);

  // A retry the user asked for is under way (as opposed to the first open of the visit).
  return { status, retry, isRetrying: status === 'opening' && attemptCount > 0 };
}
