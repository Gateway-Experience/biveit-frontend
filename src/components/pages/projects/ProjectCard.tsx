import _ from 'lodash';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { EllipsisIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';
import { choose, formatRelativeTime } from 'src/utils/common';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

// Literal class names so Tailwind picks them up. Picked per project (seeded by id) so each card keeps
// the same look across reloads.
const _PREVIEW_TINT_CLASSES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

// A few page sketches, so the grid looks like a set of different sites. Each takes the project's tint.
const _PREVIEW_LAYOUTS: Record<string, (props: { tintClass: string }) => React.ReactNode> = {
  // A coloured hero band over a row of cards.
  hero: ({ tintClass }) => (
    <>
      <div className={cn('flex flex-col gap-1.5 px-3 py-4', tintClass)}>
        <span className='h-2 w-2/3 rounded-full bg-background/70' />
        <span className='h-1.5 w-1/3 rounded-full bg-background/45' />
      </div>
      <div className='grid grid-cols-3 gap-1.5 p-2'>
        {_.times(3, index => <span key={index} className='h-6 rounded-sm bg-muted' />)}
      </div>
    </>
  ),
  // Headline on the left, a picture on the right.
  split: ({ tintClass }) => (
    <div className='grid flex-1 grid-cols-2 items-center gap-2.5 p-3'>
      <div className='flex flex-col gap-1.5'>
        <span className='h-2 w-5/6 rounded-full bg-foreground/25' />
        <span className='h-2 w-1/2 rounded-full bg-foreground/25' />
        <span className='h-1.5 w-2/3 rounded-full bg-foreground/10' />
        <span className={cn('mt-1 h-3 w-1/3 rounded-full', tintClass)} />
      </div>
      <span className={cn('h-full min-h-12 rounded-md opacity-80', tintClass)} />
    </div>
  ),
  // A short title over a row of products, each with a caption, like a shop or a gallery.
  gallery: ({ tintClass }) => (
    <div className='flex flex-1 flex-col gap-2.5 p-3'>
      <span className='mx-auto h-1.5 w-1/3 rounded-full bg-foreground/25' />
      <div className='grid grid-cols-4 gap-2'>
        {_.times(4, index => (
          <div key={index} className='flex flex-col gap-1'>
            <span className={cn('aspect-square rounded-sm', index % 2 ? 'bg-muted' : cn(tintClass, 'opacity-60'))} />
            <span className='h-1 w-3/4 rounded-full bg-foreground/15' />
          </div>
        ))}
      </div>
    </div>
  ),
  // Centred headline and button over one wide picture.
  centered: ({ tintClass }) => (
    <div className='flex flex-1 flex-col items-center gap-1.5 p-3'>
      <span className='h-2 w-1/2 rounded-full bg-foreground/25' />
      <span className='h-1.5 w-1/3 rounded-full bg-foreground/10' />
      <span className={cn('mt-0.5 h-3 w-1/5 rounded-full', tintClass)} />
      <span className='mt-1 w-full flex-1 rounded-md bg-muted' />
    </div>
  ),
};

// Intentions: projects have no screenshot (yet), so show a tiny sketch of a "site in a browser window"
// so the grid still reads as a gallery of websites rather than a wall of grey boxes.
function ProjectPreviewPlaceholder({ projectId }: { projectId: number }) {
  const tintClass = choose(_PREVIEW_TINT_CLASSES, String(projectId));
  // A different seed than the tint, so layout and colour vary independently.
  const PreviewLayout = _PREVIEW_LAYOUTS[choose(_.keys(_PREVIEW_LAYOUTS), `layout-${projectId}`)];

  return (
    <div className='flex size-full flex-col bg-linear-to-br from-accent to-muted p-3 pb-0'>
      <div className='flex flex-1 flex-col overflow-hidden rounded-t-md bg-card shadow-sm ring-1 ring-foreground/10 transition-transform duration-300 group-hover:-translate-y-0.5'>
        <div className='flex items-center gap-1 border-b px-2 py-1.5'>
          {_.times(3, index => <span key={index} className='size-1.5 rounded-full bg-foreground/15' />)}
        </div>
        <PreviewLayout tintClass={tintClass} />
      </div>
    </div>
  );
}

// The card's "⋯" menu. A sibling of the card's link, not inside it: a button nested in a link would open the
// project on every click. On wide screens it shows on hover (or focus); on touch screens there's no hover,
// so it's always there.
function ProjectCardMenu({ project, onRename, onDelete }: {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('project_menu')}
        render={(
          <Button
            variant='outline'
            size='icon-sm'
            className={cn(
              'absolute top-2.5 right-2.5 z-10 rounded-full bg-card/90 shadow-sm backdrop-blur-sm',
              'sm:opacity-0 sm:group-hover/projectcard:opacity-100 sm:focus-visible:opacity-100 sm:data-popup-open:opacity-100',
            )}
          />
        )}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto min-w-0'>
        <DropdownMenuItem onClick={() => onRename(project)}>
          <PencilIcon />
          {t('project_menu_rename')}
        </DropdownMenuItem>
        <DropdownMenuItem variant='destructive' onClick={() => onDelete(project)}>
          <Trash2Icon />
          {t('project_menu_delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// `onRename` / `onDelete`: the card's menu asks; the list owns the dialogs (see ProjectActionDialogs).
export default function ProjectCard({ project, onRename, onDelete }: {
  project: Project;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className='group/projectcard relative flex *:flex-1'>
      {/* A real link (not LinkButton) so middle-click / cmd-click open the project in a new tab for free. */}
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
      <ProjectCardMenu project={project} onRename={onRename} onDelete={onDelete} />
    </div>
  );
}
