import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CheckIcon } from 'lucide-react';

import PriceTagBadge from 'src/components/common/PriceTagBadge';
import { getPriceLabels, PLANS } from 'src/services/pricing';
import type { PlanKey } from 'src/types/launch';

// Intentions: the ways to pay in brief, one row each (name and tagline, then the price), for places too tight for
// the Pricing page's full cards — the Deploy tab. Two ways to use it:
//   - without `onSelect`, a plain summary: the best-value plan is highlighted, with its per-month note.
//   - with `onSelect`, a pick-one choice (radios): the selected plan is the highlighted one, and the badge stays
//     on best value. `hiddenPlanIds` leaves out ones that can't be picked (e.g. the code, once it's bought).
export default function PlanList({ className, selectedPlanId, onSelect, hiddenPlanIds = [] }: {
  className?: string;
  selectedPlanId?: PlanKey;
  onSelect?: (planId: PlanKey) => void;
  hiddenPlanIds?: PlanKey[];
}) {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);
  const isChoice = !!onSelect;
  const shownPlans = _.reject(PLANS, plan => _.includes(hiddenPlanIds, plan.id));

  return (
    <ul
      data-component='plan-list'
      role={isChoice ? 'radiogroup' : undefined}
      aria-label={isChoice ? t('launch_plan_title') : undefined}
      className={cn('flex flex-col gap-2', className)}
    >
      {_.map(shownPlans, plan => {
        const isSelected = isChoice && plan.id === selectedPlanId;
        const isHighlighted = isChoice ? isSelected : plan.isBestValue;
        const content = (
          <>
            {isChoice && (
              <span
                aria-hidden
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
                )}
              >
                {isSelected && <CheckIcon className='size-3' strokeWidth={3} />}
              </span>
            )}
            <div className='min-w-0 flex-1'>
              <p className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold'>
                {t(plan.nameKey)}
                {plan.isBestValue && <PriceTagBadge>{t('pricing_best_value')}</PriceTagBadge>}
              </p>
              <p className='mt-0.5 text-xs text-muted-foreground'>{t(plan.taglineKey)}</p>
            </div>
            <div className='shrink-0 text-right'>
              <p className='whitespace-nowrap'>
                <span className='font-heading text-lg font-bold'>{prices[plan.priceParam]}</span>
                <span className='ml-1 text-xs text-muted-foreground'>{t(plan.periodKey)}</span>
              </p>
              {plan.noteKey && <p className='text-xs font-medium text-ring'>{t(plan.noteKey, prices)}</p>}
            </div>
          </>
        );
        const rowClass = cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left', isHighlighted && 'border-primary bg-primary/5');

        return (
          <li key={plan.id} data-plan={plan.id} data-selected={isSelected || undefined}>
            {isChoice
              ? (
                <button
                  type='button'
                  role='radio'
                  aria-checked={isSelected}
                  onClick={() => onSelect(plan.id)}
                  className={cn(
                    rowClass,
                    'cursor-pointer transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    !isSelected && 'hover:border-primary/50 hover:bg-muted/50',
                  )}
                >
                  {content}
                </button>
              )
              : <div className={rowClass}>{content}</div>}
          </li>
        );
      })}
    </ul>
  );
}
