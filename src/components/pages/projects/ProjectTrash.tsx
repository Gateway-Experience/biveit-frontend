import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ArchiveRestoreIcon, ArrowLeftIcon, Trash2Icon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import { DeleteProjectModal } from 'src/components/pages/projects/ProjectActionDialogs';
import ProjectSearchBox from 'src/components/pages/projects/ProjectSearchBox';
import { useProjectListUpdaters, useTrashedProjects } from 'src/components/pages/projects/useProjectLists';
import useProjectSearch from 'src/components/pages/projects/useProjectSearch';
import { Button } from 'src/components/shadui/button';
import { restoreProject } from 'src/services/project';
import { formatRelativeTime } from 'src/utils/common';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

function TrashListSkeleton() {
  return (
    <div className='mt-4 flex flex-col gap-3'>
      {_.times(2, index => (
        <div key={index} className='flex h-[4.5rem] flex-col justify-center gap-2 rounded-2xl border bg-card/60 px-5'>
          <div className='h-4 w-1/3 animate-pulse rounded bg-muted' />
          <div className='h-3 w-1/5 animate-pulse rounded bg-muted' />
        </div>
      ))}
    </div>
  );
}

// Original purpose: the Trash page (from the Trash tile on the projects page). The user's trashed projects,
// most recently trashed first and searchable, each with Restore (back in the list where it was) and
// Delete forever (after a confirmation: the only way a project is deleted for good).
// References: fourpixie-frontend components/pages/Trash.tsx
export default function ProjectTrash() {
  const { t, i18n } = useTranslation();
  const notify = useNotification();
  // undefined = still loading, [] = Trash is empty.
  const { data: trashedProjects, isError: hasLoadFailed } = useTrashedProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const { matchingProjects, isSearchActive, searchedQuery, isSearching } = useProjectSearch(trashedProjects, searchQuery);
  const { restoreProjectFromTrash, removeTrashedProject } = useProjectListUpdaters();
  const [restoringProjectId, setRestoringProjectId] = useState<number | null>(null);
  // The project waiting on the "Delete forever?" confirmation.
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const restore = async (project: Project) => {
    setRestoringProjectId(project.id);
    try {
      restoreProjectFromTrash(await restoreProject(project.id));
      notify('success', t('trash_restored', { name: project.name }));
    } catch {
      notify('error', t('trash_restore_failed'));
    } finally {
      setRestoringProjectId(null);
    }
  };

  return (
    <div data-page='trash'>
      <DeleteProjectModal project={deletingProject} onClose={() => setDeletingProject(null)} onDeleted={removeTrashedProject} />

      <LinkButton href={PATHS.projects} variant='ghost' size='sm' className='-ml-2 text-muted-foreground'>
        <ArrowLeftIcon data-icon='inline-start' />
        {t('trash_back')}
      </LinkButton>
      <div className='mt-3 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='font-heading text-2xl font-bold tracking-[-0.03em]'>{t('trash_title')}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>{t('trash_subtitle')}</p>
        </div>
        {(!_.isEmpty(trashedProjects) || isSearchActive) && (
          <ProjectSearchBox value={searchQuery} onChange={setSearchQuery} isSearching={isSearching} className='w-full sm:w-64' />
        )}
      </div>

      {hasLoadFailed && <p className='py-20 text-center text-muted-foreground'>{t('trash_load_failed')}</p>}
      {_.isNil(trashedProjects) && !hasLoadFailed && <TrashListSkeleton />}
      {_.isEmpty(trashedProjects) && !_.isNil(trashedProjects) && (
        <div data-section='trash-empty' className='mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-14 text-center text-muted-foreground'>
          <Trash2Icon className='size-8' />
          <p>{t('trash_empty')}</p>
        </div>
      )}
      {!_.isEmpty(trashedProjects) && isSearchActive && _.isEmpty(matchingProjects) && (
        <p data-section='no-search-results' className='py-16 text-center text-muted-foreground'>
          {t('projects_search_no_results', { query: searchedQuery })}
        </p>
      )}
      {!_.isEmpty(matchingProjects) && (
        <ul className='mt-6 flex flex-col gap-3'>
          {_.map(matchingProjects, project => (
            <li
              key={project.id}
              data-projectid={project.id}
              className='flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border bg-card px-5 py-4'
            >
              <div className='min-w-0 flex-1'>
                <p className='truncate font-semibold'>{project.name}</p>
                <p className='mt-0.5 text-sm text-muted-foreground'>
                  {t('trash_trashed_at', { time: formatRelativeTime(project.trashed_at as string, i18n.language) })}
                </p>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  data-action='restore-project'
                  disabled={!_.isNil(restoringProjectId)}
                  onClick={() => restore(project)}
                >
                  {restoringProjectId === project.id ? <Spinner data-icon='inline-start' /> : <ArchiveRestoreIcon data-icon='inline-start' />}
                  {t('trash_restore')}
                </Button>
                <Button
                  variant='destructive'
                  data-action='delete-project'
                  disabled={!_.isNil(restoringProjectId)}
                  onClick={() => setDeletingProject(project)}
                >
                  <Trash2Icon data-icon='inline-start' />
                  {t('trash_delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
