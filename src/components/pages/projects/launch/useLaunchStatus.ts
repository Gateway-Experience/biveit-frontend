import { useQuery } from '@tanstack/react-query';

import { LAUNCH_QUERY_KEY, getLaunchStatus } from 'src/services/launch';
import type { LaunchStage } from 'src/types/launch';

// Stages where something is still on its way: polled, which on the backend also moves them along. Quick while
// the domain's set up and the site's built (minutes, and the user watches the checklist); slower while waiting
// for the user's DNS, which can take hours -- the backend's own sweep gets there anyway, nobody watching.
const _POLL_MS_BY_STAGE: Partial<Record<LaunchStage, number>> = { registering_domain: 5000, deploying: 5000, waiting_dns: 30000 };

// Original purpose: the project page's Launch tab and launch dialog, which share one read of the launch's status.
// `enabled`: only once the site is approved (before that there's nothing to launch).
export default function useLaunchStatus(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'status'],
    queryFn: () => getLaunchStatus(projectId),
    enabled,
    refetchInterval: query => (query.state.data && _POLL_MS_BY_STAGE[query.state.data.stage]) || false,
  });
}
