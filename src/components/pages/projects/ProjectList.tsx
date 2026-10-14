import { useEffect, useState } from 'react';
import _ from 'lodash';
import { useMatch, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PlusIcon, SparklesIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import NewProjectModal from 'src/components/pages/projects/NewProjectModal';
import ProjectCard from 'src/components/pages/projects/ProjectCard';
import { getProjects } from 'src/services/project';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

const _GRID_CLASS = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3';

function ProjectGridSkeleton() {
  return (
    <div className={_GRID_CLASS}>
      {_.times(3, index => (
        <div key={index} className='overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10'>
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

// Intentions: first-run screen. The whole page is basically one invitation to start building.
function ProjectsEmptyState() {
  const { t } = useTranslation();

  return (
    <div
      data-section='projects-empty'
      className='flex flex-col items-center rounded-2xl border border-dashed border-foreground/15 bg-card/50 px-6 py-16 text-center animate-in fade-in-0 duration-500'
    >
      <div className='mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
        <SparklesIcon className='size-6' />
      </div>
      <h2 className='font-heading text-xl font-bold tracking-[-0.02em]'>{t('projects_empty_title')}</h2>
      <p className='mt-2 max-w-sm text-muted-foreground'>{t('projects_empty_body')}</p>
      <LinkButton href={PATHS.newProject} size='lg' className='mt-7'>
        <PlusIcon data-icon='inline-start' />
        {t('projects_empty_cta')}
      </LinkButton>
    </div>
  );
}

// Original purpose: the home page — lists the current user's projects, or nudges them to make one.
export default function ProjectList() {
  const { t } = useTranslation();
  // null = still loading, [] = loaded but nothing there yet.
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  // The new-project form is open exactly while we're on its URL: the "New project" buttons are plain links
  // (middle-click works), and the browser's back button closes it.
  const isCreatingProject = !!useMatch(PATHS.newProject);
  const navigate = useNavigate();

  useEffect(() => {
    getProjects().then(setProjects).catch(() => setHasLoadFailed(true));
  }, []);

  const hasProjects = !_.isEmpty(projects);

  return (
    <div data-page='project-list'>
      {/* Replace: closing shouldn't leave an entry that reopens the form on "back". */}
      <NewProjectModal open={isCreatingProject} onClose={() => navigate(PATHS.projects, { replace: true })} />

      <div className='mb-8 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <span className='mb-2 block text-[0.625rem] font-bold tracking-[0.18em] text-muted-foreground uppercase'>
            {t('projects_eyebrow')}
          </span>
          <h1 className='font-heading text-3xl font-bold tracking-[-0.03em]'>{t('projects_title')}</h1>
          {hasProjects && (
            <p className='mt-1 text-muted-foreground'>{t('projects_count', { count: _.size(projects) })}</p>
          )}
        </div>
        {/* The empty state carries its own, bigger CTA, so don't show two. */}
        {hasProjects && (
          <LinkButton href={PATHS.newProject}>
            <PlusIcon data-icon='inline-start' />
            {t('projects_new')}
          </LinkButton>
        )}
      </div>

      {hasLoadFailed && <p className='py-20 text-center text-muted-foreground'>{t('projects_load_failed')}</p>}
      {_.isNil(projects) && !hasLoadFailed && <ProjectGridSkeleton />}
      {_.isEmpty(projects) && !_.isNil(projects) && <ProjectsEmptyState />}
      {hasProjects && (
        <div className={_GRID_CLASS}>
          {_.map(projects, (project, index) => (
            // Staggered fade-up on first paint; the delay caps out so long lists don't crawl in.
            <div
              key={project.id}
              className='flex animate-in fade-in-0 slide-in-from-bottom-2 duration-500 fill-mode-both *:flex-1'
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
