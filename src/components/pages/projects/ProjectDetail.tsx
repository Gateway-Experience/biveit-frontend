import { useEffect, useMemo, useReducer, useState } from 'react';
import _ from 'lodash';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { ChevronLeftIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import AgentChat from 'src/components/pages/projects/chat/AgentChat';
import DeployPanel from 'src/components/pages/projects/deploy/DeployPanel';
import SiteReadyModal from 'src/components/pages/projects/deploy/SiteReadyModal';
import useAgentChat from 'src/components/pages/projects/chat/useAgentChat';
import SitePreview from 'src/components/pages/projects/preview/SitePreview';
import useActiveBuild from 'src/components/pages/projects/preview/useActiveBuild';
import useDevenvStatus from 'src/components/pages/projects/preview/useDevenvStatus';
import useProjectSession from 'src/components/pages/projects/useProjectSession';
import { Spinner } from 'src/components/common/Spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/shadui/tabs';
import { getPreviewState } from 'src/services/devenv';
import { getProjects } from 'src/services/project';
import { PATHS } from 'src/utils/constants';
import { useMediaQuery, usePrevious } from 'src/utils/hooks';
import type { Project } from 'src/types/project';

// Tailwind's `lg`: from here up the preview sits beside the chat; below it, it's a tab in the chat panel.
const _SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

// The page's width while it's chat only (spec-ing): a step wider than the site's usual content width, since
// the chat is the whole page then.
const _CHAT_ONLY_WIDTH_CLASS = 'max-w-5xl';

// The panels take whatever height the screen has left under the title row (the layout's `isWorkspace` makes
// the page exactly screen-tall). Below the minimum, the page scrolls instead of squashing the chat.
const _PANEL_CLASS = 'min-h-[26rem] overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10';

// Original purpose: a single project's workspace — the agent chat, plus the site preview once the agent
// has started implementing (specing is chat only, at the usual page width; implementing uses the full
// width).
// Everything is keyed on the project, so moving between projects starts clean.
function ProjectWorkspace({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  // undefined = loading, null = not found (or not ours — the BE doesn't say which).
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  // Bumped whenever the dev environment may have changed, to re-read it.
  const [devenvRefreshKey, refreshDevenv] = useReducer((count: number) => count + 1, 0);
  // Loaded alongside the project rather than after it: whether there's a preview decides the layout.
  // Opening can also bring the dev servers back up, so re-read their status once it's done.
  const session = useProjectSession(projectId, { onReady: refreshDevenv });
  const chat = useAgentChat(projectId, { sessionStatus: session.status, onDevenvChange: refreshDevenv });
  const { devenv } = useDevenvStatus(chat.conversationId, devenvRefreshKey);
  // The agent says when it's building in the chat itself (signals), so it's read off the messages.
  const activeBuild = useActiveBuild(chat.messages);
  const isSideBySide = useMediaQuery(_SIDE_BY_SIDE_QUERY);
  // Until the status is known, assume specing: no preview, no wide layout.
  const previewState = devenv ? getPreviewState(devenv) : 'specing';
  // What the building animation calls the site: its name, and the first sentence of what it's about.
  const buildSketch = useMemo(() => {
    const description = _.trim(project?.description || _.toString(_.get(project, 'bootstrap_data.description', '')));
    return { siteName: project?.name || '', tagline: _.truncate(_.first(description.split(/(?<=[.!?。！？])\s*/)), { length: 90 }) };
  }, [project]);

  const preview = previewState !== 'specing' && (
    <SitePreview
      state={previewState}
      siteUrl={devenv?.preview_url || null}
      build={activeBuild}
      buildSketch={buildSketch}
      className='flex-1'
    />
  );
  // Once the user has signed off the site, publishing is on offer from then on, whatever the stage.
  const implementationDoneAt = devenv?.implementation_done_at;
  const [isSiteReadyModalOpen, setIsSiteReadyModalOpen] = useState(false);
  // TODO: `onShowCelebration` is a testing aid (a button to open the pop-up); drop it once that's signed off.
  const deploy = implementationDoneAt && <DeployPanel onShowCelebration={() => setIsSiteReadyModalOpen(true)} className='flex-1' />;
  // Preview and Deploy sit beside the chat when there's room for a side panel (and something to preview);
  // otherwise they're tabs of the chat.
  const hasSidePanel = !!preview && isSideBySide;
  const [sidePanelTab, setSidePanelTab] = useState<'preview' | 'deploy'>('preview');

  // The "just now" moment: the sign-off happened while this tab was open, i.e. a re-read took it from null
  // to a time. A fresh load (undefined -> time) is just the steady Deploy tab, no pop-up.
  const previousImplementationDoneAt = usePrevious(implementationDoneAt);
  useEffect(() => {
    if (previousImplementationDoneAt === null && implementationDoneAt) {
      setIsSiteReadyModalOpen(true);
    }
  }, [previousImplementationDoneAt, implementationDoneAt]);

  useEffect(() => {
    // There's no GET /projects/{id}; the user's own list is small, so pick it out of that.
    getProjects()
      .then(projects => setProject(_.find(projects, { id: projectId }) || null))
      // Couldn't load: show the same "not found / no access" message rather than spinning forever.
      .catch(() => setProject(null));
  }, [projectId]);

  return (
    <div data-page='project-detail' data-projectid={projectId} data-haspreview={!!preview} className={cn('mx-auto flex w-full min-h-0 flex-1 flex-col', !preview && _CHAT_ONLY_WIDTH_CLASS)}>
      <div className='mb-4 flex min-w-0 items-center gap-2'>
        <LinkButton href={PATHS.projects} variant='ghost' size='sm' className='-ml-3 text-muted-foreground'>
          <ChevronLeftIcon data-icon='inline-start' />
          {t('project_back_to_list')}
        </LinkButton>
        <span className='text-muted-foreground'>/</span>
        <h1 className='truncate font-heading text-lg font-bold tracking-[-0.02em]'>{project?.name}</h1>
      </div>

      <SiteReadyModal open={isSiteReadyModalOpen} onClose={() => setIsSiteReadyModalOpen(false)} />

      {_.isUndefined(project) && (
        <div className='flex justify-center py-20'><Spinner className='size-5 text-muted-foreground' /></div>
      )}
      {_.isNull(project) && <p className='py-20 text-center text-muted-foreground'>{t('project_not_found')}</p>}
      {project && (
        // The chat keeps its place in the tree whatever the layout, so switching layouts (the preview
        // arriving, or the window being resized) never remounts it — the draft and scroll position stay.
        <div className='flex min-h-0 flex-1 gap-4'>
          <div className={cn(_PANEL_CLASS, 'min-w-0', preview && isSideBySide ? 'w-[26rem] flex-none xl:w-[45rem]' : 'flex-1')}>
            <AgentChat
              projectId={project.id}
              bootstrapData={project.bootstrap_data}
              chat={chat}
              onRetrySession={session.retry}
              isRetryingSession={session.isRetrying}
              preview={hasSidePanel ? null : preview}
              isPreviewBuilding={!!activeBuild}
              deploy={hasSidePanel ? null : deploy}
              className='h-full'
            />
          </div>
          {hasSidePanel && (
            // Tabbed like the chat beside it. Deploy only once there's a finished site.
            <Tabs
              value={deploy ? sidePanelTab : 'preview'}
              onValueChange={setSidePanelTab}
              className={cn(_PANEL_CLASS, 'min-w-0 flex-1 gap-0')}
            >
              <div className='flex items-center gap-3 border-b pr-4'>
                <TabsList variant='line' className='min-w-0 flex-1 justify-start px-3'>
                  <TabsTrigger value='preview' className='flex-none px-3'>{t('chat_tab_preview')}</TabsTrigger>
                  {deploy && <TabsTrigger value='deploy' className='flex-none px-3'>{t('chat_tab_deploy')}</TabsTrigger>}
                </TabsList>
              </div>
              {/* Kept mounted so a trip to Deploy doesn't reload the site or lose where it was. */}
              <TabsContent value='preview' keepMounted className='flex min-h-0 flex-col'>{preview}</TabsContent>
              {deploy && <TabsContent value='deploy' className='flex min-h-0 flex-col'>{deploy}</TabsContent>}
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const projectId = Number(useParams().projectId);
  return <ProjectWorkspace key={projectId} projectId={projectId} />;
}
