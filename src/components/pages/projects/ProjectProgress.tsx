import type { CSSProperties } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

import type { Project } from 'src/types/project';

// The steps a project goes through, in order. The first is the new-project form, so every project is past it.
const _STEP_KEYS = ['project_step_describe', 'project_step_plan', 'project_step_build', 'project_step_launch'];

// [Pure] Which step the project is at (index into _STEP_KEYS), read off its stage and sign-off — nothing
// extra is stored for it. Signed off = publishing is on offer, whatever the stage.
function _getCurrentStepIndex(stage: Project['stage'], implementationDoneAt: string | null | undefined) {
  if (implementationDoneAt) {
    return 3;
  }
  return stage === 'implementing' ? 2 : 1;
}

// Intentions: a slim step bar above the workspace, so the user always knows where they are in the journey
// (describe -> plan -> build -> launch) and what comes next. Done steps get a check, the current one is
// highlighted, the rest are muted.
export default function ProjectProgress({ stage, implementationDoneAt, className, style }: {
  stage: Project['stage'];
  implementationDoneAt?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const currentStepIndex = _getCurrentStepIndex(stage, implementationDoneAt);

  return (
    <ol data-component='project-progress' data-step={currentStepIndex + 1} className={cn('flex items-center gap-2', className)} style={style}>
      {_.map(_STEP_KEYS, (stepKey, index) => {
        const isDone = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === _.size(_STEP_KEYS) - 1;
        return (
          // The last step only takes its own room (it has no line after it), so the bar ends flush with the frame below.
          <li key={stepKey} aria-current={isCurrent ? 'step' : undefined} className={cn('flex min-w-0 items-center gap-2', isLast ? 'flex-none' : 'flex-1')}>
            <span className='relative flex size-6 shrink-0'>
              {/* The current step pulses, so "you are here" is the first thing the eye lands on. */}
              {isCurrent && <span className='absolute inset-0 animate-ping rounded-full bg-primary/50' />}
              <span
                className={cn(
                  'relative flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  isDone && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isDone && !isCurrent && 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <CheckIcon className='size-3.5' /> : index + 1}
              </span>
            </span>
            <span className={cn('truncate text-sm', isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
              {t(stepKey)}
            </span>
            {!isLast && (
              <span className={cn('h-0.5 min-w-4 flex-1 rounded-full', isDone ? 'bg-primary' : 'bg-foreground/10')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
