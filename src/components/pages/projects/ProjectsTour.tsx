import { useQuery } from '@tanstack/react-query';

import SpotlightTour from 'src/components/common/SpotlightTour';
import type { SpotlightStep } from 'src/components/common/SpotlightTour';
import { getProjectHistory } from 'src/services/project';
import { finishUserTour, hasFinishedTour } from 'src/services/user';
import { useStore } from 'src/state-store';

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
// it's gone for good, on every device: that's recorded on the account (services/user.hasFinishedTour).
// Mount it once the page's content is on screen, so the tour can find what it points at.
export default function ProjectsTour() {
  const user = useStore(state => state.user);
  const set = useStore(state => state.set);
  // The cookie card goes first: it sits in the corner the tour's last stop (Help) is in, and one thing at a time.
  const cookieConsent = useStore(state => state.cookieConsent);
  const isTourDue = !!user && !hasFinishedTour(user, 'projects');
  // Only asked while the tour could still be due. undefined until it's answered: no tour meanwhile.
  const { data: projectHistory } = useQuery({
    queryKey: ['project-history', user?.id],
    queryFn: getProjectHistory,
    enabled: isTourDue,
    staleTime: 0,
  });

  if (!user || !isTourDue || !cookieConsent || projectHistory?.has_created_project !== false) {
    return null;
  }

  const finish = async () => {
    // Gone straight away, without waiting for the server; its answer then replaces this stand-in.
    set({ user: { ...user, meta: { ...user.meta, projects_tour_finished_at: new Date().toISOString() } } });
    set({ user: await finishUserTour('projects') });
  };

  return <SpotlightTour steps={_STEPS} onFinish={finish} />;
}
