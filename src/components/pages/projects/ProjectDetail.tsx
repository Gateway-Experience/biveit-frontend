import { useEffect, useState } from 'react';
import _ from 'lodash';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import AgentChat from 'src/components/pages/projects/chat/AgentChat';
import { Spinner } from 'src/components/shadui/spinner';
import { getProjects, openProject } from 'src/services/project';
import type { Project } from 'src/types/project';

// Original purpose: a single project's workspace. For now it's just the agent chat; the site preview
// will sit next to it in later build stages.
export default function ProjectDetail() {
  const { t } = useTranslation();
  const projectId = Number(useParams().projectId);
  // undefined = loading, null = not found (or not ours — the BE doesn't say which).
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    // Warm the project up as soon as the page loads, alongside everything else rather than before it.
    // Silent on failure: it's only a head start (sending a message brings the agent up anyway).
    openProject(projectId).catch(_.noop);
    // There's no GET /projects/{id}; the user's own list is small, so pick it out of that.
    getProjects()
      .then(projects => setProject(_.find(projects, { id: projectId }) || null))
      // Couldn't load: show the same "not found / no access" message rather than spinning forever.
      .catch(() => setProject(null));
  }, [projectId]);

  return (
    <div data-page='project-detail' data-projectid={projectId}>
      <div className='mb-4 flex min-w-0 items-center gap-2'>
        <LinkButton href='/' variant='ghost' size='sm' className='-ml-3 text-muted-foreground'>
          <ChevronLeftIcon data-icon='inline-start' />
          {t('project_back_to_list')}
        </LinkButton>
        <span className='text-muted-foreground'>/</span>
        <h1 className='truncate font-heading text-lg font-bold tracking-[-0.02em]'>{project?.name}</h1>
      </div>

      {_.isUndefined(project) && (
        <div className='flex justify-center py-20'><Spinner className='size-5 text-muted-foreground' /></div>
      )}
      {_.isNull(project) && <p className='py-20 text-center text-muted-foreground'>{t('project_not_found')}</p>}
      {project && (
        // The chat has no height of its own, so give it one: the viewport minus the navbar, the
        // layout's padding/margins and the title row above (~14.5rem all up).
        <div className='h-[calc(100svh-14.5rem)] min-h-[26rem] overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10'>
          <AgentChat key={project.id} projectId={project.id} className='h-full' />
        </div>
      )}
    </div>
  );
}
