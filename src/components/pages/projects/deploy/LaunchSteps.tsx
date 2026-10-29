import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { GlobeIcon, RocketIcon, SparklesIcon } from 'lucide-react';

import HumanContact from 'src/components/common/HumanContact';

const _STEPS = [
  { id: 'address', Icon: GlobeIcon, titleKey: 'deploy_step_address_title', bodyKey: 'deploy_step_address_body' },
  { id: 'online', Icon: RocketIcon, titleKey: 'deploy_step_online_title', bodyKey: 'deploy_step_online_body' },
  { id: 'improve', Icon: SparklesIcon, titleKey: 'deploy_step_improve_title', bodyKey: 'deploy_step_improve_body' },
];

// Original purpose: the bottom of the Deploy tab's offer -- what happens once they press launch, so the step feels
// small and safe: pick an address, we put it online, and they can keep changing it afterwards. Then the way to a
// person, for anyone still unsure.
export default function LaunchSteps() {
  const { t } = useTranslation();
  return (
    <div data-component='launch-steps' className='flex flex-col gap-4'>
      <p className='text-center text-[0.6875rem] font-bold tracking-[0.14em] text-muted-foreground uppercase'>{t('deploy_steps_title')}</p>
      <ol className='grid grid-cols-3 gap-2'>
        {_.map(_STEPS, (step, index) => (
          <li key={step.id} className='relative flex flex-col items-center gap-1.5 text-center'>
            {/* The dotted thread from this step to the next, behind the icons. */}
            {index < _STEPS.length - 1 && (
              <span aria-hidden='true' className='absolute top-5 left-[calc(50%+1.5rem)] w-[calc(100%-3rem+0.5rem)] border-t-2 border-dotted border-primary/50' />
            )}
            <span className='relative grid size-10 place-items-center rounded-2xl bg-primary/20 text-[color-mix(in_oklab,var(--primary)_60%,var(--brand-ink))] dark:text-primary'>
              <step.Icon className='size-4.5' />
              <span className='absolute -top-1.5 -right-1.5 grid size-4.5 place-items-center rounded-full bg-brand-light text-[0.625rem] font-bold text-brand-ink'>{index + 1}</span>
            </span>
            <span className='text-sm font-semibold'>{t(step.titleKey)}</span>
            <span className='text-xs text-muted-foreground'>{t(step.bodyKey)}</span>
          </li>
        ))}
      </ol>
      <HumanContact i18nKey='help_human' className='text-center text-xs text-muted-foreground' />
    </div>
  );
}
