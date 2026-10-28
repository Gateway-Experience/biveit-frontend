import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CheckIcon, MinusIcon } from 'lucide-react';

import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { formatUsd } from 'src/services/pricing';
import type { LaunchPlan, PlanKey } from 'src/types/launch';

// Intentions: the launch dialog's first question -- how the user wants their site: monthly, yearly (highlighted:
// the best value, with a free first-year domain), or just the code. The prices come from the backend's plans
// (services/launch's status), never from here. `hideOneTime`: someone who already bought the code only sees the
// plans that put it online.

const _PLAN_ORDER: PlanKey[] = ['monthly', 'yearly', 'one_time'];

// [Pure] The yearly plan's saving against twelve months, in whole percent.
function getYearlySavingPercent(monthly: LaunchPlan, yearly: LaunchPlan) {
  return Math.round((1 - yearly.price_usd / (monthly.price_usd * 12)) * 100);
}

export default function PlanStep({ plans, hideOneTime, onChoose }: {
  plans: LaunchPlan[];
  hideOneTime: boolean;
  onChoose: (plan: PlanKey) => void;
}) {
  const { t, i18n } = useTranslation();
  const byKey = _.keyBy(plans, 'key');
  const shownKeys = _.filter(_PLAN_ORDER, key => !!byKey[key] && !(hideOneTime && key === 'one_time'));
  const money = (amount: number) => formatUsd(amount, i18n.language);
  const editDays = byKey.one_time?.edit_days || 30;

  const features: Record<PlanKey, { text: string; included: boolean }[]> = {
    monthly: [
      { text: t('launch_feature_online'), included: true },
      { text: t('launch_feature_edits_plan'), included: true },
      { text: t('launch_feature_download'), included: true },
    ],
    yearly: [
      { text: t('launch_feature_online'), included: true },
      { text: t('launch_feature_edits_plan'), included: true },
      { text: t('launch_feature_download'), included: true },
      { text: t('launch_feature_free_domain'), included: true },
    ],
    one_time: [
      { text: t('launch_feature_self_host'), included: false },
      { text: t('launch_feature_edits_days', { days: editDays }), included: true },
      { text: t('launch_feature_download'), included: true },
    ],
  };
  const priceLine = (plan: LaunchPlan) => {
    if (plan.key === 'one_time') {
      return t('launch_once', { price: money(plan.price_usd) });
    }
    return t(plan.key === 'yearly' ? 'launch_per_year' : 'launch_per_month', { price: money(plan.price_usd) });
  };

  return (
    <div className='flex flex-col gap-5' data-component='launch-plan-step'>
      {hideOneTime && <p className='text-sm text-muted-foreground'>{t('launch_owned_code_note')}</p>}
      <div className={cn('grid gap-3', _.size(shownKeys) === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {_.map(shownKeys, key => {
          const plan = byKey[key];
          const isYearly = key === 'yearly';
          return (
            <div
              key={key}
              data-plan={key}
              className={cn('flex flex-col gap-3 rounded-2xl border bg-card p-4', isYearly && 'border-primary ring-1 ring-primary')}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='font-heading font-bold'>{t(`launch_plan_${key}`)}</span>
                {isYearly && <Badge>{t('launch_best_value')}</Badge>}
              </div>
              <div>
                <div className='text-xl font-bold'>{priceLine(plan)}</div>
                {isYearly && byKey.monthly && (
                  <div className='text-xs text-muted-foreground'>
                    {t('launch_yearly_saving', { price: money(_.round(plan.price_usd / 12, 2)), percent: getYearlySavingPercent(byKey.monthly, plan) })}
                  </div>
                )}
              </div>
              <ul className='flex flex-1 flex-col gap-1.5 text-sm'>
                {_.map(features[key], feature => (
                  <li key={feature.text} className={cn('flex items-start gap-2', !feature.included && 'text-muted-foreground')}>
                    {feature.included ? <CheckIcon className='mt-0.5 size-4 shrink-0 text-ring' /> : <MinusIcon className='mt-0.5 size-4 shrink-0' />}
                    {feature.text}
                  </li>
                ))}
              </ul>
              <Button variant={isYearly ? 'default' : 'outline'} onClick={() => onChoose(key)} data-action='choose-plan'>
                {t('launch_plan_choose')}
              </Button>
            </div>
          );
        })}
      </div>
      <p className='text-xs text-muted-foreground'>{t('launch_fair_use_note')}</p>
    </div>
  );
}
