import { useState } from 'react';
import _ from 'lodash';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { PlusIcon, Trash2Icon } from 'lucide-react';

import ProjectCard from 'src/components/pages/projects/ProjectCard';
import { RenameProjectModal, TrashProjectModal } from 'src/components/pages/projects/ProjectActionDialogs';
import ProjectSearchBox from 'src/components/pages/projects/ProjectSearchBox';
import { BuildFlowArt, DotGridBackdrop, WorkspaceBackdrop } from 'src/components/pages/projects/ProjectsArtwork';
import { useProjectListUpdaters, useProjects, useTrashedProjects } from 'src/components/pages/projects/useProjectLists';
import useProjectSearch from 'src/components/pages/projects/useProjectSearch';
import WelcomeShow from 'src/components/pages/projects/WelcomeShow';
import { Button } from 'src/components/shadui/button';
import { useStore } from 'src/state-store';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

const _GRID_CLASS = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

function ProjectGridSkeleton() {
  return (
    <div className={_GRID_CLASS}>
      {_.times(3, index => (
        <div key={index} className='overflow-hidden rounded-surface glass-surface'>
          <div className='aspect-[16/10] animate-pulse bg-muted' />
          <div className='flex flex-col gap-2 p-4'>
            <div className='h-4 w-1/2 animate-pulse rounded bg-muted' />
            <div className='h-3 w-5/6 animate-pulse rounded bg-muted' />
            <div className='h-3 w-2/3 animate-pulse rounded bg-muted' />
          </div>
        </div>
      ))}
    </div>
  );
}

// The way into Trash, shaped like an empty slot in the project grid: where the projects it holds used to be.
// References: fourpixie-frontend components/pages/projects/ProjectList.tsx (TrashTile)
function TrashTile({ trashCount, className }: { trashCount: number; className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      to={PATHS.trash}
      data-action='open-trash'
      data-trashcount={trashCount}
      className={cn(
        'group flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-surface border-2 border-dashed border-foreground/15 p-5 text-muted-foreground transition',
        'outline-none hover:border-primary/60 hover:bg-card/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
    >
      <span className='flex size-11 items-center justify-center rounded-full bg-foreground/5 transition group-hover:bg-primary/15 group-hover:text-foreground'>
        <Trash2Icon className='size-5' />
      </span>
      <span className='font-heading text-base font-semibold'>{t('projects_trash')}</span>
      <span className='text-sm'>{t('projects_trash_count', { count: trashCount })}</span>
    </Link>
  );
}

// Intentions: the page with no projects. The whole page is basically one invitation to start building.
function ProjectsEmptyState() {
  const { t } = useTranslation();
  const set = useStore(state => state.set);

  return (
    <div
      data-section='projects-empty'
      className='relative isolate flex flex-col items-center overflow-hidden rounded-surface glass-surface px-6 py-14 text-center animate-in fade-in-0 duration-500'
    >
      <DotGridBackdrop />
      <BuildFlowArt className='mb-8 w-full max-w-[340px]' />
      <h2 className='font-heading text-xl font-bold tracking-[-0.02em]'>{t('projects_empty_title')}</h2>
      <p className='mt-2 max-w-sm text-muted-foreground'>{t('projects_empty_body')}</p>
      <Button size='lg' className='mt-7' onClick={() => set({ isNewProjectOpen: true })}>
        <PlusIcon data-icon='inline-start' />
        {t('projects_empty_cta')}
      </Button>
    </div>
  );
}

// Original purpose: the home page — lists the current user's projects, or nudges them to make one. Projects
// can be searched, renamed, or moved to Trash (from their ⋯ menu); Trash is a tile at the end of the grid.
export default function ProjectList() {
  const { t } = useTranslation();
  // Shared with the sidebar. undefined = still loading, [] = loaded but nothing there yet. Most recently
  // edited first (pinning and filing don't change that).
  const { data: unsortedProjects, isError: hasLoadFailed } = useProjects();
  const projects = unsortedProjects && _.orderBy(unsortedProjects, ['updated_at'], ['desc']);
  const { data: trashedProjects } = useTrashedProjects();
  const trashCount = _.size(trashedProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const { matchingProjects, isSearchActive, searchedQuery, isSearching } = useProjectSearch(projects, searchQuery);
  const { setProject, moveProjectToTrash } = useProjectListUpdaters();
  // The project whose rename / trash dialog is open, if any.
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [trashingProject, setTrashingProject] = useState<Project | null>(null);
  const set = useStore(state => state.set);

  const hasProjects = !_.isEmpty(projects);
  // Trash isn't a search result, so it steps aside while searching.
  const isTrashShown = trashCount > 0 && !isSearchActive;
  const hasNoProjects = _.isEmpty(projects) && !_.isNil(projects);

  return (
    <div data-page='project-list'>
      <WorkspaceBackdrop />
      {/* A rename counts as an edit (fresh updated_at), so the sort moves the project to the top. */}
      <RenameProjectModal project={renamingProject} onClose={() => setRenamingProject(null)} onRenamed={setProject} />
      <TrashProjectModal project={trashingProject} onClose={() => setTrashingProject(null)} onTrashed={moveProjectToTrash} />

      {/* The page header: a slim panel. Title and count on the left, search and "New project" on the right,
          and the line art in between on wide screens (and not when the empty state below already shows it).
          Search and "New project" are always there, even with nothing to search yet: the first-time tour
          (ProjectsIntro) starts by pointing at them. */}
      <header className='relative isolate mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 overflow-hidden rounded-surface glass-surface px-5 py-4 sm:px-6'>
        <DotGridBackdrop />
        <span aria-hidden='true' className='pointer-events-none absolute -top-20 right-1/3 -z-10 size-48 rounded-full bg-primary/10 blur-3xl' />
        <div className='min-w-0'>
          <h1 className='font-heading text-2xl font-bold tracking-[-0.03em]'>{t('projects_title')}</h1>
          {hasProjects && (
            <p className='text-sm text-muted-foreground'>{t('projects_count', { count: _.size(projects) })}</p>
          )}
        </div>
        {hasProjects && (
          <div className='hidden min-w-0 flex-1 justify-center xl:flex'>
            <BuildFlowArt className='pointer-events-none h-16 w-auto' />
          </div>
        )}
        <div className='flex w-full items-center gap-3 sm:ml-auto sm:w-auto'>
          <div data-tour='search' className='flex-1 sm:w-64 sm:flex-none'>
            <ProjectSearchBox value={searchQuery} onChange={setSearchQuery} isSearching={isSearching} />
          </div>
          {/* bg-clip-border: the theme's buttons paint inside their (transparent) border, so the fill reads 2px
              shorter than the search box beside it, whose border shows. */}
          <Button data-tour='new-project' className='h-10 shrink-0 bg-clip-border' onClick={() => set({ isNewProjectOpen: true })}>
            <PlusIcon data-icon='inline-start' />
            {t('projects_new')}
          </Button>
        </div>
      </header>

      {hasLoadFailed && <p className='py-20 text-center text-muted-foreground'>{t('projects_load_failed')}</p>}
      {_.isNil(projects) && !hasLoadFailed && <ProjectGridSkeleton />}
      {hasNoProjects && (
        <>
          <ProjectsEmptyState />
          {trashCount > 0 && <TrashTile trashCount={trashCount} className='mt-5 min-h-0 py-4 sm:w-80' />}
        </>
      )}
      {hasProjects && isSearchActive && _.isEmpty(matchingProjects) && (
        <p data-section='no-search-results' className='py-16 text-center text-muted-foreground'>
          {t('projects_search_no_results', { query: searchedQuery })}
        </p>
      )}
      {!_.isEmpty(matchingProjects) && (
        <div className={_GRID_CLASS}>
          {_.map(matchingProjects, (project, index) => (
            // Staggered fade-up on first paint; the delay caps out so long lists don't crawl in.
            <div
              key={project.id}
              className='flex animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both *:flex-1'
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <ProjectCard project={project} onRename={setRenamingProject} onTrash={setTrashingProject} />
            </div>
          ))}
          {isTrashShown && <TrashTile trashCount={trashCount} />}
        </div>
      )}

      {/* The first-time welcome. Mounted with the page so it can cover it from the first paint while it works out
          whether it's due. The spotlight tour (ProjectsIntro) is parked for now while we try this one out; mount
          it here again to bring it back. */}
      <WelcomeShow />
    </div>
  );
}
