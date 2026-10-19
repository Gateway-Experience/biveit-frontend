import _ from 'lodash';

import { callBe } from 'src/utils/request';
import type { DevenvStatus, PreviewState } from 'src/types/preview';

// Intentions: the project's dev environment as the browser sees it — which stage the project is in and
// whether its dev site is up to be previewed.
// The BE only nudges (a `devenv` event on the conversation stream, see subscribeToConversationEvents);
// the status itself is always re-read from here.

async function getDevenvStatus(conversationId: number): Promise<DevenvStatus> {
  return callBe(`/conversations/${conversationId}/devenv`);
}

// [Pure]
function getPreviewState(devenv: DevenvStatus): PreviewState {
  // Only an explicit "implementing" gets a preview — anything else (specing, or a stage we don't know yet)
  // stays chat only rather than showing a broken preview.
  if (devenv.stage !== 'implementing') {
    return 'specing';
  }
  // A setup/restart in progress wins over the servers' status, which is in flux then.
  if (devenv.busy) {
    return 'busy';
  }
  return _.some(devenv.servers, { app: 'frontend', status: 'online' }) && devenv.preview_url ? 'live' : 'down';
}

export {
  getDevenvStatus,
  getPreviewState,
};
