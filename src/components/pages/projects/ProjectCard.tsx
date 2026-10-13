import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { choose, formatRelativeTime } from 'src/utils/common';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

// Literal class names so Tailwind picks them up. Picked per project (seeded by id) so each card keeps
// the same tint across reloads.
const _PREVIEW_TINT_CLASSES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

// Intentions: projects have no screenshot (yet), so show a tiny wireframe "site in a browser window"
// so the grid still reads as a gallery of websites rather than a wall of grey boxes.
function ProjectPreviewPlaceholder({ projectId }: { projectId: number }) {
  const tintClass = choose(_PREVIEW_TINT_CLASSES, String(projectId));

  return (
    <div className='flex size-full flex-col bg-muted p-3 pb-0'>
      <div className='flex flex-1 flex-col overflow-hidden rounded-t-md bg-card ring-1 ring-foreground/10'>
        <div className='flex items-center gap-1 border-b px-2 py-1.5'>
          <span className='size-1.5 rounded-full bg-foreground/15' />
          <span className='size-1.5 rounded-full bg-foreground/15' />
          <span className='size-1.5 rounded-full bg-foreground/15' />
        </div>
        <div className={cn('flex flex-col gap-1.5 px-3 py-4', tintClass)}>
          <span className='h-2 w-2/3 rounded-full bg-background/70' />
          <span className='h-1.5 w-1/3 rounded-full bg-background/45' />
        </div>
        <div className='grid grid-cols-3 gap-1.5 p-2'>
          <span className='h-6 rounded-sm bg-muted' />
          <span className='h-6 rounded-sm bg-muted' />
          <span className='h-6 rounded-sm bg-muted' />
        </div>
      </div>
    </div>
  );
}

export default function ProjectCard({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();

  return (
    // A real link (not LinkButton) so middle-click / cmd-click open the project in a new tab for free.
    <Link
      to={`${PATHS.projects}/${project.id}`}
      data-projectid={project.id}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground ring-1 ring-foreground/10',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary',
        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
      )}
    >
      <div className='aspect-[16/10] overflow-hidden border-b'>
        <ProjectPreviewPlaceholder projectId={project.id} />
      </div>

      <div className='flex flex-1 flex-col gap-1.5 p-4'>
        <h3 className='truncate font-heading text-base font-semibold tracking-[-0.01em]'>{project.name}</h3>
        <p className='line-clamp-2 min-h-10 text-sm text-muted-foreground'>
          {project.description || t('projects_no_description')}
        </p>
        <p className='mt-auto pt-2 text-xs text-muted-foreground'>
          {t('projects_edited', { time: formatRelativeTime(project.updated_at, i18n.language) })}
        </p>
      </div>
    </Link>
  );
}
