import { useQuery } from '@tanstack/react-query';

import { LAUNCH_QUERY_KEY, getLaunchStatus } from 'src/services/launch';
import type { LaunchStage } from 'src/types/launch';

// Stages where something is still on its way (a domain being set up, DNS, a deployment): polled, which on the
// backend also moves them along.
const _MOVING_STAGES: LaunchStage[] = ['registering_domain', 'waiting_dns', 'deploying'];
const _POLL_MS = 5000;

// Original purpose: the project page's Launch tab and launch dialog, which share one read of the launch's status.
// `enabled`: only once the site is approved (before that there's nothing to launch).
export default function useLaunchStatus(projectId: number, enabled: boolean) {
  return useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'status'],
    queryFn: () => getLaunchStatus(projectId),
    enabled,
    refetchInterval: query => (query.state.data && _MOVING_STAGES.includes(query.state.data.stage) ? _POLL_MS : false),
  });
}
