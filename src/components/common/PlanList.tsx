import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { getPriceLabels, PLANS } from 'src/services/pricing';

// Intentions: the ways to pay in brief, one row each (name and tagline, then the price), for places too tight for
// the Pricing page's full cards — the Deploy tab. The best-value plan is highlighted, with its per-month note.
export default function PlanList({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);

  return (
    <ul data-component='plan-list' className={cn('flex flex-col gap-2', className)}>
      {_.map(PLANS, plan => (
        <li
          key={plan.id}
          data-plan={plan.id}
          className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', plan.isBestValue && 'border-primary bg-primary/5')}
        >
          <div className='min-w-0 flex-1'>
            <p className='flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold'>
              {t(plan.nameKey)}
              {plan.isBestValue && (
                <span className='rounded-full bg-primary px-2 py-px text-[0.625rem] font-bold tracking-[0.06em] text-primary-foreground uppercase'>
                  {t('pricing_best_value')}
                </span>
              )}
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
        </li>
      ))}
    </ul>
  );
}
