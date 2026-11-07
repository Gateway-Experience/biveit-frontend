import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ArchiveIcon, ArchiveRestoreIcon, ArrowLeftIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import ProjectSearchBox from 'src/components/pages/projects/ProjectSearchBox';
import { ProjectRowsSkeleton } from 'src/components/pages/projects/ProjectTrash';
import { useArchivedProjects, useProjectListUpdaters } from 'src/components/pages/projects/useProjectLists';
import useProjectSearch from 'src/components/pages/projects/useProjectSearch';
import { Button } from 'src/components/shadui/button';
import { unarchiveProject } from 'src/services/project';
import { formatRelativeTime } from 'src/utils/common';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

// Original purpose: the Archived page (the sidebar's "Archived"). The user's archived projects, most recently archived
// first and searchable, each with a way back into the list. An archived project can't be opened from here, same as one
// in Trash: bringing it back comes first.
export default function ProjectArchive() {
  const { t, i18n } = useTranslation();
  const notify = useNotification();
  // undefined = still loading, [] = nothing archived.
  const { data: archivedProjects, isError: hasLoadFailed } = useArchivedProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const { matchingProjects, isSearchActive, searchedQuery, isSearching } = useProjectSearch(archivedProjects, searchQuery);
  const { restoreProjectFromArchive } = useProjectListUpdaters();
  const [restoringProjectId, setRestoringProjectId] = useState<number | null>(null);

  const restore = async (project: Project) => {
    setRestoringProjectId(project.id);
    try {
      restoreProjectFromArchive(await unarchiveProject(project.id));
      notify('success', t('archived_restored', { name: project.name }));
    } catch {
      notify('error', t('archived_restore_failed'));
    } finally {
      setRestoringProjectId(null);
    }
  };

  return (
    <div data-page='archived'>
      <LinkButton href={PATHS.projects} variant='ghost' size='sm' className='-ml-2 text-muted-foreground'>
        <ArrowLeftIcon data-icon='inline-start' />
        {t('trash_back')}
      </LinkButton>
      <div className='mt-3 flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='font-heading text-2xl font-bold tracking-[-0.03em]'>{t('archived_title')}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>{t('archived_subtitle')}</p>
        </div>
        {(!_.isEmpty(archivedProjects) || isSearchActive) && (
          <ProjectSearchBox value={searchQuery} onChange={setSearchQuery} isSearching={isSearching} className='w-full sm:w-64' />
        )}
      </div>

      {hasLoadFailed && <p className='py-20 text-center text-muted-foreground'>{t('archived_load_failed')}</p>}
      {_.isNil(archivedProjects) && !hasLoadFailed && <ProjectRowsSkeleton />}
      {_.isEmpty(archivedProjects) && !_.isNil(archivedProjects) && (
        <div data-section='archived-empty' className='mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed py-14 text-center text-muted-foreground'>
          <ArchiveIcon className='size-8' />
          <p>{t('archived_empty')}</p>
        </div>
      )}
      {!_.isEmpty(archivedProjects) && isSearchActive && _.isEmpty(matchingProjects) && (
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
                  {t('archived_at', { time: formatRelativeTime(project.archived_at as string, i18n.language), interpolation: { escapeValue: false } })}
                </p>
              </div>
              <Button
                variant='outline'
                data-action='unarchive-project'
                disabled={!_.isNil(restoringProjectId)}
                onClick={() => restore(project)}
              >
                {restoringProjectId === project.id ? <Spinner data-icon='inline-start' /> : <ArchiveRestoreIcon data-icon='inline-start' />}
                {t('archived_restore')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
