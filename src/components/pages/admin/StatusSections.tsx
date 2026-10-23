import _ from 'lodash';
import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from 'src/components/shadui/card';
import type { StatusSection } from 'src/types/admin';

// Intentions: the platform's status sections (biveit-backend services/platform_status) as cards of
// label/value rows -- the same rows `scripts.manage status` prints, so the two always agree.
// The backend writes problems in capitals (OFF, CRASHED, HUNG, NOT listening, MISSING...) and a running turn
// as WORKING; those values are tinted so they stand out in a wall of rows.

const _ALARMING_WORDS = /\b(OFF|CRASHED|HUNG|NOT|MISSING|UNREACHABLE|FAILED|NONE|NO)\b/;

// [Pure]
function getValueTone(value: string): 'alarming' | 'active' | 'plain' {
  if (_ALARMING_WORDS.test(value)) {
    return 'alarming';
  }
  return /\bWORKING\b/.test(value) ? 'active' : 'plain';
}

export default function StatusSections({ sections }: { sections: StatusSection[] }) {
  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      {_.map(sections, section => (
        <Card key={section.title} size='sm' data-section={_.kebabCase(section.title)}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className='grid grid-cols-[minmax(8rem,max-content)_1fr] gap-x-4 gap-y-1.5 text-sm'>
              {_.map(section.rows, (row, index) => (
                <div key={`${row.label}-${index}`} className='contents'>
                  <dt className='text-muted-foreground'>{row.label}</dt>
                  <dd
                    className={cn(
                      'min-w-0 font-mono text-xs leading-5 break-words',
                      getValueTone(row.value) === 'alarming' && 'text-destructive',
                      getValueTone(row.value) === 'active' && 'text-primary font-semibold',
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
