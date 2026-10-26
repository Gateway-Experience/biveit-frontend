import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import SpotlightTour from 'src/components/common/SpotlightTour';
import type { SpotlightStep } from 'src/components/common/SpotlightTour';
import { getProjectHistory } from 'src/services/project';
import { addJourneyStep, getMyJourneys } from 'src/services/user';
import { useStore } from 'src/state-store';
import type { UserJourneyStep } from 'src/types/user';

// The tour's stops, in order. Each points at an element marked `data-tour` (ProjectList's header, the sidebar).
// The ones not on screen are skipped: the sidebar's on phones, or when it's collapsed.
const _STEPS: SpotlightStep[] = [
  { id: 'new-project', target: 'new-project', titleKey: 'tour_new_project_title', bodyKey: 'tour_new_project_body' },
  { id: 'search', target: 'search', titleKey: 'tour_search_title', bodyKey: 'tour_search_body' },
  { id: 'folders', target: 'folders', titleKey: 'tour_folders_title', bodyKey: 'tour_folders_body' },
  { id: 'help', target: 'help', titleKey: 'tour_help_title', bodyKey: 'tour_help_body' },
];

// Original purpose: the first-time experience on the projects page. When an account that has never made a
// project lands here, a spotlight tour points out the essentials (starting a project, searching, folders, help)
// with the rest of the page dimmed and out of reach. Anyone who's made one before (even if it's since been
// trashed or deleted for good) already knows their way around, so never gets it. Once it's finished or skipped
// it's gone for good, on every device: it's the account's `projects_intro` journey (services/user.getMyJourneys),
// and any step logged in it means it's been seen.
// It stays out of the new-project form's way: if the form has been open during this visit to the page -- it opens
// by itself when someone arrives with an idea from the landing page -- the tour waits for the next visit (a reload,
// or coming back to the page) instead of popping up the moment the form closes. It isn't marked seen meanwhile.
// Mount it once the page's content is on screen, so the tour can find what it points at.
export default function ProjectsIntro() {
  const queryClient = useQueryClient();
  const user = useStore(state => state.user);
  // The cookie card goes first: it sits in the corner the tour's last stop (Help) is in, and one thing at a time.
  const cookieConsent = useStore(state => state.cookieConsent);
  const isNewProjectOpen = useStore(state => state.isNewProjectOpen);
  // Latches for as long as this page is up: the form having been open once is enough (see the top).
  const [hasNewProjectFormShown, setHasNewProjectFormShown] = useState(isNewProjectOpen);
  useEffect(() => {
    if (isNewProjectOpen) {
      setHasNewProjectFormShown(true);
    }
  }, [isNewProjectOpen]);
  const journeysKey = ['my-journeys', user?.id];
  const { data: journeys } = useQuery({ queryKey: journeysKey, queryFn: getMyJourneys, enabled: !!user });
  // undefined until the journeys are in: no tour meanwhile.
  const isTourDue = !!journeys && !journeys.projects_intro;
  // Only asked while the tour could still be due. undefined until it's answered: no tour meanwhile.
  const { data: projectHistory } = useQuery({
    queryKey: ['project-history', user?.id],
    queryFn: getProjectHistory,
    enabled: isTourDue,
    staleTime: 0,
  });

  if (!user || !isTourDue || !cookieConsent || hasNewProjectFormShown || projectHistory?.has_created_project !== false) {
    return null;
  }

  const finish = async () => {
    // Gone straight away, without waiting for the server; its answer then replaces this stand-in.
    const standIn: UserJourneyStep = { id: 0, journey: 'projects_intro', step: 'finished', data: {}, created_at: new Date().toISOString() };
    queryClient.setQueryData(journeysKey, { ...journeys, projects_intro: standIn });
    const finished = await addJourneyStep('projects_intro', 'finished');
    queryClient.setQueryData(journeysKey, { ...journeys, projects_intro: finished });
  };

  return <SpotlightTour steps={_STEPS} onFinish={finish} />;
}
