import _ from 'lodash';
import { useQuery } from '@tanstack/react-query';

import { searchProjectPrompts } from 'src/services/project';
import { useDebouncedValue } from 'src/utils/hooks';
import type { Project } from 'src/types/project';

// Mirrors the BE's PROJECT_SEARCH_MIN_LENGTH: shorter queries don't search the prompts.
const _PROMPT_SEARCH_MIN_LENGTH = 2;
// Typing pauses this long before the prompts are searched, so each keystroke doesn't cost a request.
const _PROMPT_SEARCH_DELAY_MS = 300;

// [Pure] Whether the project's name or description has `query` in it, ignoring case.
function _isTextMatch(project: Project, query: string) {
  const lowerQuery = _.toLower(query);
  return _.includes(_.toLower(project.name), lowerQuery) || _.includes(_.toLower(project.description || ''), lowerQuery);
}

// Intentions: the search box over a project list (the projects page, Trash). Name and description matches
// come straight from the list we already have; matches on what the user wrote while prompting come from
// the BE once they pause typing. Results keep the list's own order. With an empty query, it's the whole list.
// References: ProjectSearchDialog (the ⌘K palette, same two sources but with excerpts)
export default function useProjectSearch(projects: Project[] | undefined, query: string) {
  const normalizedQuery = _.trim(query).replace(/\s+/g, ' ');
  const debouncedQuery = useDebouncedValue(normalizedQuery, _PROMPT_SEARCH_DELAY_MS);
  const canSearchPrompts = debouncedQuery.length >= _PROMPT_SEARCH_MIN_LENGTH;
  const { data: promptMatches, isFetching: isSearchingPrompts } = useQuery({
    queryKey: ['project-prompt-search', debouncedQuery],
    queryFn: () => searchProjectPrompts(debouncedQuery),
    enabled: canSearchPrompts,
    staleTime: 30000,
  });

  const promptMatchIds = new Set(_.map(canSearchPrompts ? promptMatches : [], 'project_id'));
  const matchingProjects = normalizedQuery
    ? _.filter(projects, project => _isTextMatch(project, normalizedQuery) || promptMatchIds.has(project.id))
    : projects;

  return {
    matchingProjects,
    // Whether a search is on (results are filtered), and the query it's for, for "no projects match …".
    isSearchActive: !!normalizedQuery,
    searchedQuery: normalizedQuery,
    // Still waiting on the pause or on the BE: the magnifier turns into a spinner.
    isSearching: !!normalizedQuery && (normalizedQuery !== debouncedQuery || isSearchingPrompts),
  };
}
