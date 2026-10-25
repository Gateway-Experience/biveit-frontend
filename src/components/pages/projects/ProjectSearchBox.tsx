import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { SearchIcon, XIcon } from 'lucide-react';

import { Spinner } from 'src/components/common/Spinner';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from 'src/components/shadui/input-group';

// Intentions: the search box over a project list (see useProjectSearch). Esc or the × clears it.
// References: fourpixie-frontend components/pages/projects/ProjectSearchBox.tsx
export default function ProjectSearchBox({ value, onChange, isSearching, className }: {
  value: string;
  onChange: (value: string) => void;
  // A search is on its way: the magnifier turns into a spinner.
  isSearching?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <InputGroup className={cn('h-10 rounded-lg bg-background', className)}>
      <InputGroupAddon>
        {isSearching ? <Spinner className='size-4' /> : <SearchIcon className='size-4' />}
      </InputGroupAddon>
      <InputGroupInput
        type='search'
        value={value}
        placeholder={t('projects_search_placeholder')}
        aria-label={t('projects_search_label')}
        data-action='search-projects'
        maxLength={200}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onChange('')}
        className='[&::-webkit-search-cancel-button]:hidden'
      />
      {value && (
        <InputGroupAddon align='inline-end'>
          <InputGroupButton size='icon-xs' aria-label={t('projects_search_clear')} data-action='clear-search' onClick={() => onChange('')}>
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
