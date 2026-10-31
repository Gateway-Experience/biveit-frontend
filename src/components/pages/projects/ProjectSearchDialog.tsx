import { useState } from 'react';
import _ from 'lodash';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import { FolderOpenIcon, MessageSquareTextIcon, XIcon } from 'lucide-react';

import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import { useProjects } from 'src/components/pages/projects/useProjectLists';
import { searchProjectPrompts } from 'src/services/project';
import { useDebouncedValue } from 'src/utils/hooks';
import { PATHS } from 'src/utils/constants';
import type { Project } from 'src/types/project';

// Mirrors the BE's PROJECT_SEARCH_MIN_LENGTH: shorter queries don't search the prompts.
const _PROMPT_SEARCH_MIN_LENGTH = 2;
const _RECENT_COUNT = 8;

type SearchResult = { project: Project; excerpt?: string };

// [Pure] `text` with each case-insensitive occurrence of `query` wrapped in <mark>, so the user sees why
// the project matched.
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) {
    return text;
  }
  const parts = _.split(text, new RegExp(`(${_.escapeRegExp(query)})`, 'i'));
  return _.map(parts, (part, index) => (
    index % 2 ? <mark key={index} className='rounded-sm bg-primary/15 px-0.5 text-foreground'>{part}</mark> : part
  ));
}

// Original purpose: the sidebar's Search button (and ⌘K / Ctrl+K).
// Intentions: find a project by its name, or by something the user wrote while prompting it ("the one
// where I asked for a loyalty program"), and jump to it. Name matches come from the list already loaded;
// prompt matches come from the BE once the user pauses typing, each with the bit of text that matched.
// It floats over the page without dimming it, like a command palette. Arrows move, Enter opens.
export default function ProjectSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = _.trim(query).replace(/\s+/g, ' ');
  const debouncedQuery = useDebouncedValue(normalizedQuery, 250);
  const canSearchPrompts = debouncedQuery.length >= _PROMPT_SEARCH_MIN_LENGTH;
  const { data: promptMatches, isFetching: isSearchingPrompts } = useQuery({
    queryKey: ['project-prompt-search', debouncedQuery],
    queryFn: () => searchProjectPrompts(debouncedQuery),
    enabled: open && canSearchPrompts,
    staleTime: 30000,
  });

  const projectsById = _.keyBy(projects, 'id');
  const nameMatches: SearchResult[] = _.map(
    _.orderBy(_.filter(projects, project => _.includes(_.toLower(project.name), _.toLower(normalizedQuery))), ['updated_at'], ['desc']),
    project => ({ project }),
  );
  // Prompt matches for a project already found by name would just repeat it. Only for the query that's
  // actually shown, so stale answers from a previous query never mix in.
  const promptResults: SearchResult[] = canSearchPrompts && debouncedQuery === normalizedQuery
    ? _.compact(_.map(promptMatches, match => (
      projectsById[match.project_id] && !_.some(nameMatches, item => item.project.id === match.project_id)
        ? { project: projectsById[match.project_id], excerpt: match.excerpt }
        : null
    )))
    : [];
  const results: SearchResult[] = normalizedQuery
    ? [...nameMatches, ...promptResults]
    : _.map(_.take(_.orderBy(projects, ['updated_at'], ['desc']), _RECENT_COUNT), project => ({ project }));
  const highlightedIndex = _.clamp(activeIndex, 0, Math.max(_.size(results) - 1, 0));
  const isWaitingForPrompts = canSearchPrompts && (isSearchingPrompts || debouncedQuery !== normalizedQuery);

  const close = () => {
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const openProject = (projectId: number) => {
    close();
    navigate(`${PATHS.projects}/${projectId}`);
  };

  const moveWithKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(_.clamp(highlightedIndex + (event.key === 'ArrowDown' ? 1 : -1), 0, Math.max(_.size(results) - 1, 0)));
    } else if (event.key === 'Enter' && results[highlightedIndex]) {
      openProject(results[highlightedIndex].project.id);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={isOpen => !isOpen && close()}>
      <DialogPrimitive.Portal>
        {/* No backdrop on purpose: the page stays as it is underneath, seen through the frosted glass like the other
            frames (glass-surface). */}
        <DialogPrimitive.Popup
          data-component='project-search'
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex h-[min(460px,76vh)] w-[min(720px,calc(100%-2rem))] -translate-1/2 flex-col',
            'overflow-hidden rounded-surface glass-surface text-popover-foreground outline-none',
            'duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-closed:animate-out data-closed:fade-out-0',
          )}
        >
          <DialogPrimitive.Title className='sr-only'>{t('search_title')}</DialogPrimitive.Title>
          <div className='flex items-center gap-2 border-b px-5 py-3'>
            <input
              autoFocus
              value={query}
              placeholder={t('search_placeholder')}
              aria-label={t('search_title')}
              className='h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground'
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={moveWithKeys}
            />
            {isWaitingForPrompts && <Spinner className='size-4 text-muted-foreground' />}
            <DialogPrimitive.Close render={<Button variant='ghost' size='icon-sm' aria-label={t('search_close')} />}>
              <XIcon />
            </DialogPrimitive.Close>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-3 py-3'>
            <p className='px-3 pb-2 text-xs font-medium text-muted-foreground'>
              {normalizedQuery ? t('search_results') : t('search_recent')}
            </p>
            {_.isEmpty(results) && !isWaitingForPrompts && (
              <p className='px-3 py-8 text-center text-sm text-muted-foreground'>
                {normalizedQuery ? t('search_no_results') : t('sidebar_recents_empty')}
              </p>
            )}
            <ul className='flex flex-col gap-px'>
              {_.map(results, (result, index) => (
                <li key={result.project.id}>
                  <button
                    type='button'
                    data-projectid={result.project.id}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm',
                      index === highlightedIndex ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                    onMouseMove={() => index !== highlightedIndex && setActiveIndex(index)}
                    onClick={() => openProject(result.project.id)}
                  >
                    {result.excerpt
                      ? <MessageSquareTextIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                      : <FolderOpenIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />}
                    <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                      <span className='truncate'>{highlightMatches(result.project.name, normalizedQuery)}</span>
                      {result.excerpt && (
                        <span className='line-clamp-2 text-xs text-muted-foreground'>{highlightMatches(result.excerpt, normalizedQuery)}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
