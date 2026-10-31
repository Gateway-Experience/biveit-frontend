import { useEffect, useMemo, useReducer, useState } from 'react';
import _ from 'lodash';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { AppWindowIcon, ChevronLeftIcon, RocketIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import PillTabsList from 'src/components/common/PillTabsList';
import AgentChat from 'src/components/pages/projects/chat/AgentChat';
import ProjectProgress from 'src/components/pages/projects/ProjectProgress';
import PanelResizeHandle from 'src/components/pages/projects/PanelResizeHandle';
import { WorkspaceBackdrop } from 'src/components/pages/projects/ProjectsArtwork';
import DeployPanel from 'src/components/pages/projects/deploy/DeployPanel';
import SiteReadyModal from 'src/components/pages/projects/deploy/SiteReadyModal';
import LaunchDialog from 'src/components/pages/projects/launch/LaunchDialog';
import useLaunchStatus from 'src/components/pages/projects/launch/useLaunchStatus';
import useAgentChat from 'src/components/pages/projects/chat/useAgentChat';
import SitePreview from 'src/components/pages/projects/preview/SitePreview';
import useActiveBuild from 'src/components/pages/projects/preview/useActiveBuild';
import useDevenvStatus from 'src/components/pages/projects/preview/useDevenvStatus';
import useProjectSession from 'src/components/pages/projects/useProjectSession';
import { Spinner } from 'src/components/common/Spinner';
import { Tabs, TabsContent } from 'src/components/shadui/tabs';
import { getPreviewState } from 'src/services/devenv';
import { getProjects, getSitePreviewUrl } from 'src/services/project';
import { PATHS } from 'src/utils/constants';
import { useElementSize, useMediaQuery, usePrevious } from 'src/utils/hooks';
import type { OpenLaunchDialog, PlanKey } from 'src/types/launch';
import type { Project } from 'src/types/project';

// Tailwind's `lg`: from here up the preview sits beside the chat; below it, it's a tab in the chat panel.
const _SIDE_BY_SIDE_QUERY = '(min-width: 1024px)';

// The chat's width beside the preview, in px: by default half the room (the two panels the same size), or whatever
// the user dragged it to (kept in this browser, see _readStoredChatWidth). Never narrower than the minimum, and never
// so wide the preview gets squeezed below its own.
const _CHAT_MIN_WIDTH_PX = 352;
const _PREVIEW_MIN_WIDTH_PX = 420;
// The handle between the panels, which also makes the gap between them (its w-4).
const _HANDLE_WIDTH_PX = 16;
const _CHAT_WIDTH_STORAGE_KEY = 'biveit:workspace-chat-width';

// The width the user last dragged the chat to, or null (never, or storage isn't available). A per-browser
// convenience only, so any trouble reading it just means the default.
function _readStoredChatWidth() {
  try {
    const storedWidth = Number(window.localStorage.getItem(_CHAT_WIDTH_STORAGE_KEY));
    return storedWidth > 0 ? storedWidth : null;
  } catch {
    return null;
  }
}

function _storeChatWidth(width: number | null) {
  try {
    if (_.isNull(width)) {
      window.localStorage.removeItem(_CHAT_WIDTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(_CHAT_WIDTH_STORAGE_KEY, String(width));
    }
  } catch {
    // Private mode or blocked storage: the width just won't be remembered.
  }
}

// The page's width while it's chat only (planning): a step wider than the site's usual content width, since
// the chat is the whole page then.
const _CHAT_ONLY_WIDTH_CLASS = 'max-w-5xl';

// The panels take whatever height the screen has left under the title row (the layout's `isWorkspace` makes
// the page exactly screen-tall). Below the minimum, the page scrolls instead of squashing the chat.
// The shadow lifts them off the backdrop.
const _PANEL_CLASS = 'min-h-[26rem] overflow-hidden rounded-surface glass-surface';

// Original purpose: a single project's workspace — the agent chat, plus the site preview once the agent
// has started building (planning is chat only, at the usual page width; building uses the full
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
  // The user's own chat width (null = the default), and the room the two panels share.
  const [chosenChatWidth, setChosenChatWidth] = useState<number | null>(_readStoredChatWidth);
  const [setPanelsElement, panelsSize] = useElementSize<HTMLDivElement>();
  const [setChatPanelElement, chatPanelSize] = useElementSize<HTMLDivElement>();
  // The chat's size is left to CSS -- half the room by default, the limits as min/max-width -- and never computed
  // from a measurement: feeding the row's measured width back into the chat's width made a loop in Firefox, whose
  // row grows with its content (wider chat -> wider row -> wider chat), running the chat off the screen. The
  // measurements below only tell the resize handle where a drag starts and how far it may go.
  const chatSizeStyle = {
    width: _.isNull(chosenChatWidth) ? `calc(50% - ${_HANDLE_WIDTH_PX / 2}px)` : chosenChatWidth,
    minWidth: _CHAT_MIN_WIDTH_PX,
    maxWidth: `calc(100% - ${_HANDLE_WIDTH_PX + _PREVIEW_MIN_WIDTH_PX}px)`,
  };
  // Not measured yet on the first render (0): no upper limit until it is.
  const maxChatWidth = panelsSize.width
    ? Math.max(_CHAT_MIN_WIDTH_PX, panelsSize.width - _HANDLE_WIDTH_PX - _PREVIEW_MIN_WIDTH_PX)
    : Infinity;
  const chooseChatWidth = (width: number | null) => {
    setChosenChatWidth(width);
    _storeChatWidth(width);
  };
  // Until the status is known, assume planning: no preview, no wide layout.
  const previewState = devenv ? getPreviewState(devenv) : 'planning';
  // What the building animation calls the site: its name, and the first sentence of what it's about.
  const buildSketch = useMemo(() => {
    const description = _.trim(project?.description || _.toString(_.get(project, 'bootstrap_data.description', '')));
    return { siteName: project?.name || '', tagline: _.truncate(_.first(description.split(/(?<=[.!?。！？])\s*/)), { length: 90 }) };
  }, [project]);

  const preview = previewState !== 'planning' && (
    <SitePreview
      state={previewState}
      siteUrl={devenv?.preview_url || null}
      build={activeBuild}
      buildSketch={buildSketch}
      className='flex-1'
    />
  );
  // Once the user has signed off the site, publishing is on offer from then on, whatever the stage.
  const buildApprovedAt = devenv?.build_approved_at;
  const [isSiteReadyModalOpen, setIsSiteReadyModalOpen] = useState(false);
  // The launch: its status (shared by the Deploy tab and the dialog) and the dialog, opened in the mode asked for.
  const { data: launchStatus } = useLaunchStatus(projectId, !!buildApprovedAt);
  const isLaunchPending = launchStatus?.stage === 'not_paid';
  // What the dialog was opened for (its mode, and the plan if one was picked already); null = closed.
  const [launchRequest, setLaunchRequest] = useState<{ mode: 'new' | 'domain'; plan: PlanKey | null } | null>(null);
  const openLaunchDialog: OpenLaunchDialog = (mode, options = {}) => {
    setIsSiteReadyModalOpen(false);
    setLaunchRequest({ mode, plan: options.plan || null });
  };
  const deploy = buildApprovedAt && (
    <DeployPanel
      projectId={projectId}
      projectName={project?.name || ''}
      status={launchStatus}
      onLaunch={openLaunchDialog}
      sitePictureUrl={project?.site_preview_at ? getSitePreviewUrl(project) : null}
      className='flex-1'
    />
  );
  // Preview and Deploy sit beside the chat when there's room for a side panel (and something to preview);
  // otherwise they're tabs of the chat.
  const hasSidePanel = !!preview && isSideBySide;
  const [sidePanelTab, setSidePanelTab] = useState<'preview' | 'deploy'>('preview');

  // The "just now" moment: the sign-off happened while this tab was open, i.e. a re-read took it from null
  // to a time. A fresh load (undefined -> time) is just the steady Deploy tab, no pop-up.
  const previousBuildApprovedAt = usePrevious(buildApprovedAt);
  useEffect(() => {
    if (previousBuildApprovedAt === null && buildApprovedAt) {
      setIsSiteReadyModalOpen(true);
    }
  }, [previousBuildApprovedAt, buildApprovedAt]);

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

      <WorkspaceBackdrop />
      {project && (
        // As wide as the chat frame under it: the whole row while it's chat only, the chat's own width beside the preview.
        <ProjectProgress
          stage={devenv?.stage || project.stage}
          buildApprovedAt={devenv?.build_approved_at}
          className='mb-4'
          style={hasSidePanel ? chatSizeStyle : undefined}
        />
      )}
      <SiteReadyModal
        open={isSiteReadyModalOpen}
        onClose={() => setIsSiteReadyModalOpen(false)}
        projectId={projectId}
        projectName={project?.name || ''}
        status={launchStatus}
        onLaunch={openLaunchDialog}
      />
      {launchStatus && (
        <LaunchDialog
          projectId={projectId}
          projectName={project?.name || ''}
          open={!!launchRequest}
          mode={launchRequest?.mode || 'new'}
          initialPlan={launchRequest?.plan}
          status={launchStatus}
          onClose={() => setLaunchRequest(null)}
        />
      )}

      {_.isUndefined(project) && (
        <div className='flex justify-center py-20'><Spinner className='size-5 text-muted-foreground' /></div>
      )}
      {_.isNull(project) && <p className='py-20 text-center text-muted-foreground'>{t('project_not_found')}</p>}
      {project && (
        // The chat keeps its place in the tree whatever the layout, so switching layouts (the preview
        // arriving, or the window being resized) never remounts it — the draft and scroll position stay.
        // contain-inline-size: the row's width comes from the page, never from what's inside it -- so a chat width
        // too big for this screen (e.g. one dragged on a bigger monitor) can't stretch the page sideways.
        <div ref={setPanelsElement} className={cn('flex min-h-0 flex-1 [contain:inline-size]', !hasSidePanel && 'gap-4')}>
          <div
            ref={setChatPanelElement}
            data-workspace-panel='chat'
            className={cn(_PANEL_CLASS, 'min-w-0', hasSidePanel ? 'flex-none' : 'flex-1')}
            style={hasSidePanel ? chatSizeStyle : undefined}
          >
            <AgentChat
              projectId={project.id}
              bootstrapData={project.bootstrap_data}
              chat={chat}
              onRetrySession={session.retry}
              isRetryingSession={session.isRetrying}
              preview={hasSidePanel ? null : preview}
              activeBuild={activeBuild}
              deploy={hasSidePanel ? null : deploy}
              isLaunchPending={isLaunchPending}
              onOpenDeploy={hasSidePanel && deploy && sidePanelTab !== 'deploy' ? () => setSidePanelTab('deploy') : undefined}
              className='h-full'
            />
          </div>
          {hasSidePanel && (
            <PanelResizeHandle
              width={chatPanelSize.width}
              minWidth={_CHAT_MIN_WIDTH_PX}
              maxWidth={maxChatWidth}
              onResize={chooseChatWidth}
              onReset={() => chooseChatWidth(null)}
            />
          )}
          {hasSidePanel && (
            // Tabbed like the chat beside it. Deploy only once there's a finished site.
            <Tabs
              value={deploy ? sidePanelTab : 'preview'}
              onValueChange={setSidePanelTab}
              data-workspace-panel='side'
              className={cn(_PANEL_CLASS, 'min-w-0 flex-1 gap-0')}
            >
              {/* As tall as the chat's header beside it (AgentChat's tab row), so the two lines up. */}
              <div className='flex h-14 shrink-0 items-center gap-3 border-b pr-4'>
                <PillTabsList
                  tabs={_.compact([
                    { value: 'preview', label: t('chat_tab_preview'), Icon: AppWindowIcon },
                    deploy && { value: 'deploy', label: t('chat_tab_deploy'), Icon: RocketIcon },
                  ])}
                  className='ml-3'
                />
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
