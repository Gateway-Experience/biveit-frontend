import { useEffect, useState } from 'react';
import _ from 'lodash';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import {
  CheckIcon, ChevronRightIcon, ChevronsUpDownIcon, EllipsisIcon, FolderIcon, FolderInputIcon, FolderMinusIcon,
  FolderPlusIcon, HouseIcon, LifeBuoyIcon, LogInIcon, LogOutIcon, PencilIcon, PinIcon, PinOffIcon, PlusIcon,
  SearchIcon, TagIcon, Trash2Icon, UserIcon, UserPlusIcon,
} from 'lucide-react';

import BrandLogo from 'src/components/common/BrandLogo';
import HelpChat from 'src/components/common/HelpChat';
import LanguageSelector from 'src/components/common/LanguageSelector';
import { useNotification } from 'src/components/common/NotificationProvider';
import {
  DeleteFolderModal, DeleteProjectModal, FolderNameModal, RenameProjectModal,
} from 'src/components/pages/projects/ProjectActionDialogs';
import ProjectSearchDialog from 'src/components/pages/projects/ProjectSearchDialog';
import {
  groupProjectsForSidebar, useProjectFolders, useProjectListUpdaters, useProjects,
} from 'src/components/pages/projects/useProjectLists';
import { Avatar, AvatarFallback, AvatarImage } from 'src/components/shadui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'src/components/shadui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from 'src/components/shadui/sidebar';
import { useStore } from 'src/state-store';
import { updateProject } from 'src/services/project';
import { getAvatarUrl, getDisplayName, isSignedInUser } from 'src/services/user';
import { PATHS, SIDEBAR_WIDTH_PX } from 'src/utils/constants';
import { useLogout } from 'src/utils/hooks';
import { buildLoginPath } from 'src/utils/authRedirect';
import type { Project, ProjectChanges, ProjectFolder } from 'src/types/project';
import type { User } from 'src/types/user';

// The sidebar's items read at the app's usual text-sm (the registry's default is text-xs, small next to the
// pages); the language switcher and the profile button match.
const _ITEM_TEXT_CLASS = 'text-sm';

// What a click on the collapsed rail must leave alone: the controls on it do their own thing, and only the
// empty space around them expands the sidebar.
const _INTERACTIVE_SELECTOR = 'a, button, input, [role="menuitem"], [role="button"]';

function UserAvatar({ user, className }: { user?: User | null; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarImage src={getAvatarUrl(user)} />
      <AvatarFallback>{(getDisplayName(user) || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

// Intentions: the drag handle on the sidebar's right edge. While dragging, the width goes straight onto the
// wrapper's --sidebar-width (no React render per pointer move — the page next to it can be a heavy chat +
// preview), and the wrapper is flagged data-resizing so the width's easing is switched off (index.css).
// The final width is handed up on release, to be kept. Pointer capture keeps the drag going over the preview
// iframe, which would otherwise swallow the moves. Double-click puts the default width back.
function SidebarResizeHandle({ onResized }: { onResized: (width: number) => void }) {
  const { t } = useTranslation();

  const startResizing = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = event.currentTarget;
    const wrapper = handle.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) {
      return;
    }
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    wrapper.dataset.resizing = 'true';
    // The sidebar starts at the window's left edge, so the pointer's x is the width.
    const toWidth = (clientX: number) => _.clamp(Math.round(clientX), SIDEBAR_WIDTH_PX.min, SIDEBAR_WIDTH_PX.max);
    const followPointer = (moveEvent: PointerEvent) => {
      wrapper.style.setProperty('--sidebar-width', `${toWidth(moveEvent.clientX)}px`);
    };
    const stopResizing = (upEvent: PointerEvent) => {
      handle.removeEventListener('pointermove', followPointer);
      delete wrapper.dataset.resizing;
      onResized(toWidth(upEvent.clientX));
    };
    handle.addEventListener('pointermove', followPointer);
    handle.addEventListener('pointerup', stopResizing, { once: true });
    handle.addEventListener('pointercancel', stopResizing, { once: true });
  };

  return (
    <div
      role='separator'
      aria-orientation='vertical'
      aria-label={t('sidebar_resize')}
      title={t('sidebar_resize')}
      onPointerDown={startResizing}
      onDoubleClick={() => onResized(SIDEBAR_WIDTH_PX.default)}
      className={cn(
        'absolute inset-y-0 -right-1.5 z-20 w-3 cursor-col-resize touch-none',
        // A thin line shows where to grab, on hover and while dragging.
        'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors',
        'hover:after:bg-sidebar-border in-data-resizing:after:bg-primary/40',
      )}
    />
  );
}

// The "⋯" menu on a project in the sidebar: pin, file into a folder, rename, delete. Each choice is
// handed up as an action; the sidebar does the work (and owns the dialogs). Like every sidebar menu it's
// as wide as its longest item (w-auto min-w-0), so there's no empty strip on the right.
function ProjectItemMenu({ project, folders, onChange, onNewFolder, onRename, onDelete }: {
  project: Project;
  folders: ProjectFolder[];
  onChange: (project: Project, changes: ProjectChanges) => void;
  onNewFolder: (project: Project) => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const { t } = useTranslation();
  const isPinned = !_.isNil(project.pinned_at);
  const isInLiveFolder = _.some(folders, { id: project.folder_id });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuAction showOnHover aria-label={t('project_menu')} />}>
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent side='right' align='start' className='w-auto min-w-0'>
        <DropdownMenuItem onClick={() => onChange(project, { is_pinned: !isPinned })}>
          {isPinned ? <PinOffIcon /> : <PinIcon />}
          {isPinned ? t('project_menu_unpin') : t('project_menu_pin')}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className='gap-2 pr-1.5'>
            <FolderInputIcon />
            {t('project_menu_move')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className='w-auto max-w-60 min-w-0'>
            {_.map(folders, folder => (
              <DropdownMenuItem key={folder.id} onClick={() => onChange(project, { folder_id: folder.id })}>
                <FolderIcon />
                <span className='min-w-0 flex-1 truncate'>{folder.name}</span>
                {project.folder_id === folder.id && <CheckIcon className='ml-auto' />}
              </DropdownMenuItem>
            ))}
            {!_.isEmpty(folders) && <DropdownMenuSeparator />}
            {isInLiveFolder && (
              <DropdownMenuItem onClick={() => onChange(project, { folder_id: null })}>
                <FolderMinusIcon />
                {t('project_menu_remove_from_folder')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onNewFolder(project)}>
              <FolderPlusIcon />
              {t('sidebar_new_folder')}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => onRename(project)}>
          <PencilIcon />
          {t('project_menu_rename')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={() => onDelete(project)}>
          <Trash2Icon />
          {t('project_menu_delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ProjectItemActions = Omit<React.ComponentProps<typeof ProjectItemMenu>, 'project' | 'folders'>;

// One section's worth of projects (Pinned, a folder's contents, Recents), each a link with its "⋯" menu.
function SidebarProjectList({ projects, folders, actions, onNavigate }: {
  projects: Project[];
  folders: ProjectFolder[];
  actions: ProjectItemActions;
  onNavigate: () => void;
}) {
  const location = useLocation();

  return (
    <SidebarMenu>
      {_.map(projects, project => (
        <SidebarMenuItem key={project.id}>
          <SidebarMenuButton
            isActive={location.pathname === `${PATHS.projects}/${project.id}`}
            render={<Link to={`${PATHS.projects}/${project.id}`} onClick={onNavigate} data-projectid={project.id} />}
            className={_ITEM_TEXT_CLASS}
          >
            <span className='truncate'>{project.name}</span>
          </SidebarMenuButton>
          <ProjectItemMenu project={project} folders={folders} {...actions} />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

// A folder in the sidebar: click to fold / unfold its projects, "⋯" to rename or delete it.
function SidebarFolder({ folder, projects, folders, actions, onRenameFolder, onDeleteFolder, onNavigate }: {
  folder: ProjectFolder;
  projects: Project[];
  folders: ProjectFolder[];
  actions: ProjectItemActions;
  onRenameFolder: (folder: ProjectFolder) => void;
  onDeleteFolder: (folder: ProjectFolder) => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Collapsible defaultOpen render={<SidebarMenuItem />} className='group/folder'>
      <CollapsibleTrigger render={<SidebarMenuButton className={_ITEM_TEXT_CLASS} />}>
        <ChevronRightIcon className='transition-transform group-data-open/folder:rotate-90' />
        <span className='truncate'>{folder.name}</span>
      </CollapsibleTrigger>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuAction showOnHover aria-label={t('folder_menu')} />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' className='w-auto min-w-0'>
          <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
            <PencilIcon />
            {t('project_menu_rename')}
          </DropdownMenuItem>
          <DropdownMenuItem variant='destructive' onClick={() => onDeleteFolder(folder)}>
            <Trash2Icon />
            {t('project_menu_delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CollapsibleContent className='ml-3.5 border-l border-sidebar-border pl-1.5'>
        {_.isEmpty(projects)
          ? <p className='px-2 py-1.5 text-xs text-muted-foreground'>{t('sidebar_folder_empty')}</p>
          : <SidebarProjectList projects={projects} folders={folders} actions={actions} onNavigate={onNavigate} />}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Intentions: the signed-in user's projects, in the sidebar's three sections — Pinned, the Folders they've
// made, then Recents (everything else, last edited first). Every project shows up in exactly one of them
// (see groupProjectsForSidebar). Also owns the dialogs the items' menus open.
function SidebarProjects({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation();
  const notify = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects } = useProjects();
  const { data: folders = [] } = useProjectFolders();
  const { setProject, removeProject, setFolder, removeFolder } = useProjectListUpdaters();
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  // 'new' = the "new folder" dialog. `projectToFile` is set when it was opened from a project's "Move to",
  // so the project goes straight into the folder it makes.
  const [editingFolder, setEditingFolder] = useState<ProjectFolder | 'new' | null>(null);
  const [projectToFile, setProjectToFile] = useState<Project | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<ProjectFolder | null>(null);
  const { pinned, byFolderId, recents } = groupProjectsForSidebar(projects, folders);

  const changeProject = async (project: Project, changes: ProjectChanges) => {
    try {
      setProject(await updateProject(project.id, changes));
    } catch {
      notify('error', t('project_update_failed'));
    }
  };

  const actions: ProjectItemActions = {
    onChange: changeProject,
    onNewFolder: (project) => {
      setProjectToFile(project);
      setEditingFolder('new');
    },
    onRename: setRenamingProject,
    onDelete: setDeletingProject,
  };

  const saveFolder = (folder: ProjectFolder) => {
    setFolder(folder);
    if (projectToFile) {
      changeProject(projectToFile, { folder_id: folder.id });
    }
  };

  // Deleting the project that's open leaves nothing to look at: back to the list.
  const afterProjectDeleted = (projectId: number) => {
    removeProject(projectId);
    if (location.pathname === `${PATHS.projects}/${projectId}`) {
      navigate(PATHS.projects, { replace: true });
    }
  };

  return (
    <>
      {!_.isEmpty(pinned) && (
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar_pinned')}</SidebarGroupLabel>
          <SidebarProjectList projects={pinned} folders={folders} actions={actions} onNavigate={onNavigate} />
        </SidebarGroup>
      )}

      <SidebarGroup>
        <SidebarGroupLabel>{t('sidebar_folders')}</SidebarGroupLabel>
        <SidebarGroupAction title={t('sidebar_new_folder')} aria-label={t('sidebar_new_folder')} onClick={() => setEditingFolder('new')}>
          <PlusIcon />
        </SidebarGroupAction>
        {_.isEmpty(folders)
          ? (
            <button
              type='button'
              className='flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              onClick={() => setEditingFolder('new')}
            >
              <FolderPlusIcon className='size-4' />
              {t('sidebar_folders_empty')}
            </button>
          )
          : (
            <SidebarMenu>
              {_.map(folders, folder => (
                <SidebarFolder
                  key={folder.id}
                  folder={folder}
                  projects={byFolderId[folder.id] || []}
                  folders={folders}
                  actions={actions}
                  onRenameFolder={setEditingFolder}
                  onDeleteFolder={setDeletingFolder}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          )}
      </SidebarGroup>

      {/* Empty because everything's pinned or filed: nothing to say. Empty because there are no projects at
          all: say so. */}
      {(!_.isEmpty(recents) || _.isEmpty(projects)) && (
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar_recents')}</SidebarGroupLabel>
          {_.isEmpty(recents) && !_.isNil(projects)
            ? <p className='px-2 py-1.5 text-xs text-muted-foreground'>{t('sidebar_recents_empty')}</p>
            : <SidebarProjectList projects={recents} folders={folders} actions={actions} onNavigate={onNavigate} />}
        </SidebarGroup>
      )}

      <RenameProjectModal project={renamingProject} onClose={() => setRenamingProject(null)} onRenamed={setProject} />
      <DeleteProjectModal project={deletingProject} onClose={() => setDeletingProject(null)} onDeleted={afterProjectDeleted} />
      <FolderNameModal
        folder={editingFolder}
        onClose={() => {
          setEditingFolder(null);
          setProjectToFile(null);
        }}
        onSaved={saveFolder}
      />
      <DeleteFolderModal folder={deletingFolder} onClose={() => setDeletingFolder(null)} onDeleted={removeFolder} />
    </>
  );
}

// Original purpose: the app's navigation, replacing the old top bar.
// Intentions: a left sidebar. On top: the brand, the collapse button, then New project and Search. In the
// middle, the user's projects (Pinned / Folders / Recents, see SidebarProjects). At the bottom, the "about
// me" things: language, Help, then the profile button (the account menu).
// It collapses to an icon rail (remembered between visits, see SidebarProvider) so the project workspace gets
// more room; clicking any empty space on the rail opens it again. Open, its right edge can be dragged to
// make it wider or narrower (`onResized` gets the new width to keep). On phones it's a drawer behind the
// top bar's menu button. Signed out: Home, plus Log in and Sign up in the profile button's place.
export default function AppSidebar({ onResized }: { onResized: (width: number) => void }) {
  const { t } = useTranslation();
  const user = useStore(state => state.user);
  const location = useLocation();
  const logout = useLogout();
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isSignedIn = isSignedInUser(user);
  const isCollapsed = state === 'collapsed' && !isMobile;
  const displayName = getDisplayName(user);
  // Login comes back to the current page afterwards.
  const loginPath = buildLoginPath(location.pathname + location.search + location.hash);
  // On phones the sidebar is a drawer: following a link should also put it away.
  const closeIfMobile = () => isMobile && setOpenMobile(false);

  // ⌘K / Ctrl+K opens Search from anywhere, like most apps with a search box.
  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }
    const openSearchOnShortcut = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', openSearchOnShortcut);
    return () => window.removeEventListener('keydown', openSearchOnShortcut);
  }, [isSignedIn]);

  // Only a click on the rail itself counts: React bubbles clicks out of portals too (menus, the help
  // chat), and those aren't inside the rail in the DOM.
  const expandOnEmptyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (isCollapsed && event.currentTarget.contains(target) && !target.closest(_INTERACTIVE_SELECTOR)) {
      setOpen(true);
    }
  };

  return (
    <Sidebar
      collapsible='icon'
      data-component='app-sidebar'
      onClick={expandOnEmptyClick}
      className={cn(isCollapsed && 'cursor-e-resize')}
    >
      <SidebarHeader className='flex-row items-center justify-between gap-2 px-3 py-4 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-2'>
        <Link to='/' onClick={closeIfMobile} className='rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <BrandLogo hasWordmark={!isCollapsed} markClassName='h-8' />
        </Link>
        {/* Collapsed, the whole rail is the "open" button, so this would just be in the way. */}
        {!isMobile && !isCollapsed && <SidebarTrigger className='text-muted-foreground' />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {isSignedIn
              ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip={t('projects_new')} render={<Link to={PATHS.newProject} onClick={closeIfMobile} />} className={_ITEM_TEXT_CLASS}>
                      <PlusIcon />
                      <span>{t('projects_new')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip={t('search_open')} onClick={() => setIsSearchOpen(true)} className={_ITEM_TEXT_CLASS}>
                      <SearchIcon />
                      <span>{t('search_open')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* Signed-in users are the ones about to publish (and pay), so pricing stays a click away for them too. */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === PATHS.pricing}
                      tooltip={t('pricing_nav')}
                      render={<Link to={PATHS.pricing} onClick={closeIfMobile} />}
                      className={_ITEM_TEXT_CLASS}
                    >
                      <TagIcon />
                      <span>{t('pricing_nav')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )
              : (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === '/'}
                      tooltip={t('nav_home')}
                      render={<Link to='/' onClick={closeIfMobile} />}
                      className={_ITEM_TEXT_CLASS}
                    >
                      <HouseIcon />
                      <span>{t('nav_home')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname === PATHS.pricing}
                      tooltip={t('pricing_nav')}
                      render={<Link to={PATHS.pricing} onClick={closeIfMobile} />}
                      className={_ITEM_TEXT_CLASS}
                    >
                      <TagIcon />
                      <span>{t('pricing_nav')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
          </SidebarMenu>
        </SidebarGroup>

        {/* The lists need the room: the rail shows just the buttons above. */}
        {isSignedIn && !isCollapsed && <SidebarProjects onNavigate={closeIfMobile} />}
      </SidebarContent>

      <SidebarFooter className='gap-1 pb-3'>
        <SidebarMenu>
          <SidebarMenuItem>
            <LanguageSelector
              options={{ label: isCollapsed ? 'none' : 'name', side: isMobile ? 'top' : 'right' }}
              className={cn('h-8 w-full justify-start gap-2 px-2 font-normal', isCollapsed && 'justify-center px-0')}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t('help_open')} onClick={() => setIsHelpOpen(true)} className={_ITEM_TEXT_CLASS}>
              <LifeBuoyIcon />
              <span>{t('help_open')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isSignedIn
            ? (
              <SidebarMenuItem className='mt-1'>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={t('nav_account_menu')}
                    render={(
                      <SidebarMenuButton
                        size='lg'
                        className='data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground'
                      />
                    )}
                  >
                    <UserAvatar user={user} className='size-8 shrink-0' />
                    <span title={displayName} className='min-w-0 flex-1 truncate text-sm font-medium'>{displayName}</span>
                    <ChevronsUpDownIcon className='ml-auto size-4 text-muted-foreground' />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side={isMobile ? 'top' : 'right'} align='end' className='w-56'>
                    <p title={displayName} className='truncate px-2.5 py-1.5 text-xs text-muted-foreground'>{displayName}</p>
                    <DropdownMenuItem render={<Link to={PATHS.userProfile} onClick={closeIfMobile} />}>
                      <UserIcon />
                      {t('nav_profile_settings')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOutIcon />
                      {t('logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            )
            : (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={t('nav_log_in')} render={<Link to={loginPath} onClick={closeIfMobile} />} className={_ITEM_TEXT_CLASS}>
                    <LogInIcon />
                    <span>{t('nav_log_in')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={t('register')} render={<Link to={PATHS.register} onClick={closeIfMobile} />} className={_ITEM_TEXT_CLASS}>
                    <UserPlusIcon />
                    <span>{t('register')}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
        </SidebarMenu>
      </SidebarFooter>
      {!isMobile && !isCollapsed && <SidebarResizeHandle onResized={onResized} />}

      <HelpChat open={isHelpOpen} onOpenChange={setIsHelpOpen} />
      {isSignedIn && <ProjectSearchDialog open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}
    </Sidebar>
  );
}
