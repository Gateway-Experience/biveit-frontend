import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { cn } from 'cn';
import { CheckIcon, RocketIcon } from 'lucide-react';

import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import LaunchProgress from 'src/components/pages/projects/launch/LaunchProgress';
import { Button } from 'src/components/shadui/button';
import { DialogDescription, DialogTitle } from 'src/components/shadui/dialog';
import { downloadCode, redeploySite } from 'src/services/launch';
import { formatUsd } from 'src/services/pricing';
import type { LaunchStatus } from 'src/types/launch';

// The pitch's list -- what launching gets them. Keys of i18nMappings.
const _PITCH_FEATURE_KEYS = ['launch_feature_online', 'launch_feature_edits_plan', 'launch_feature_download', 'launch_feature_free_domain'];

// The celebration's blocks come in one after another, once the pop-up itself has risen into place.
// `both` keeps each one hidden during its delay instead of flashing in first.
const _ENTER_CLASS = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out [animation-fill-mode:both]';

// [Pure]
function _getEnterStyle(order: number) {
  return { animationDelay: `${200 + order * 90}ms` };
}

// Original purpose: the project's Launch tab, once the user has signed off the built site (build_approved_at) --
// the offer to launch until something's bought, then where the launch stands (services/launch's status): going
// live, the plan, the domain, redeploying, downloading the code, finishing a missing domain.
// `variant`: 'tab' is the steady tab. 'celebration' is the pop-up at the moment of sign-off: only the offer, roomier,
// headlined "Your site is ready!", and animated in -- and it must sit inside a dialog, since its headline and pitch
// become the dialog's title and description.
// `onLaunch` opens the launch dialog: 'new' to buy a plan, 'domain' to finish / choose a domain on a running plan.
// Fills whatever box it's given; scrolls when it's taller.
export default function DeployPanel({ variant = 'tab', projectId, projectName, status, onLaunch, onShowCelebration, className }: {
  variant?: 'tab' | 'celebration';
  projectId: number;
  projectName: string;
  // Undefined while loading.
  status?: LaunchStatus;
  onLaunch: (mode: 'new' | 'domain') => void;
  // TODO: testing aid — opens the "your site is ready" pop-up on demand. Remove once it's been signed off.
  onShowCelebration?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const isCelebration = variant === 'celebration';
  const showsOffer = isCelebration || status?.stage === 'not_paid';

  return (
    <div data-component='deploy-panel' data-variant={variant} data-stage={status?.stage} className={cn('min-h-0 overflow-y-auto', className)}>
      <div className={cn('mx-auto flex w-full max-w-md flex-col', isCelebration ? 'gap-7 px-6 pt-12 pb-10 sm:px-10' : 'gap-5 px-4 py-8')}>
        {!isCelebration && !status && <div className='flex justify-center py-10'><Spinner className='size-5 text-muted-foreground' /></div>}
        {showsOffer && <LaunchOffer isCelebration={isCelebration} status={status} onLaunch={() => onLaunch('new')} />}
        {!showsOffer && status && <LaunchState projectId={projectId} projectName={projectName} status={status} onLaunch={onLaunch} />}
        {onShowCelebration && (
          <Button variant='link' size='sm' className='self-center text-muted-foreground' onClick={onShowCelebration}>
            {t('deploy_test_show_popup')}
          </Button>
        )}
      </div>
    </div>
  );
}

function LaunchOffer({ isCelebration, status, onLaunch }: { isCelebration: boolean; status?: LaunchStatus; onLaunch: () => void }) {
  const { t, i18n } = useTranslation();
  // Each block's entrance, only when celebrating.
  const enter = (order: number) => (isCelebration ? { className: _ENTER_CLASS, style: _getEnterStyle(order) } : {});
  const Title = isCelebration ? DialogTitle : 'h2';
  const Description = isCelebration ? DialogDescription : 'p';
  const monthly = _.find(status?.plans, { key: 'monthly' });

  return (
    <>
      <div className='text-center'>
        <div
          className={cn(
            'mx-auto flex items-center justify-center bg-primary text-primary-foreground',
            isCelebration
              ? 'mb-5 size-16 rounded-3xl shadow-lg animate-in fade-in-0 zoom-in-50 spin-in-12 duration-500 ease-out [animation-fill-mode:both] [animation-delay:150ms]'
              : 'mb-4 size-12 rounded-2xl',
          )}
        >
          <RocketIcon className={isCelebration ? 'size-8' : 'size-6'} />
        </div>
        <div {...enter(1)}>
          <Title className={cn('font-heading font-bold tracking-[-0.02em]', isCelebration ? 'text-3xl' : 'text-xl')}>
            {t(isCelebration ? 'deploy_ready_title' : 'deploy_title')}
          </Title>
          <Description className={cn('text-muted-foreground', isCelebration ? 'mt-3 text-base' : 'mt-1.5 text-sm')}>
            {t('deploy_body')}
          </Description>
        </div>
      </div>
      <div {...enter(2)}>
        <div className='rounded-2xl border bg-card p-5'>
          {monthly && <div className='text-lg font-bold'>{t('launch_from_price', { price: formatUsd(monthly.price_usd, i18n.language) })}</div>}
          <ul className='mt-4 flex flex-col gap-2.5 text-sm'>
            {_.map(_PITCH_FEATURE_KEYS, key => (
              <li key={key} className='flex items-start gap-2.5'>
                <CheckIcon className='mt-0.5 size-4 shrink-0 text-ring' />
                {t(key)}
              </li>
            ))}
          </ul>
          <Button size='lg' className='mt-5 w-full' onClick={onLaunch} data-action='launch'>
            {t('launch_cta')}
          </Button>
        </div>
      </div>
    </>
  );
}

function LaunchState({ projectId, projectName, status, onLaunch }: {
  projectId: number;
  projectName: string;
  status: LaunchStatus;
  onLaunch: (mode: 'new' | 'domain') => void;
}) {
  const { t, i18n } = useTranslation();
  const notify = useNotification();
  const formatDate = (date: string) => new Date(date).toLocaleDateString(i18n.language);
  const { mutate: redeploy, isPending: isRedeploying } = useMutation({
    mutationFn: () => redeploySite(projectId),
    onSuccess: () => notify('success', t('launch_redeploy_started')),
    onError: error => {
      const until = _.get(error, 'data.until');
      notify('error', until ? t('launch_redeploy_cooldown', { time: new Date(until).toLocaleTimeString(i18n.language) }) : t('launch_error_generic'));
    },
  });
  const { mutate: download, isPending: isDownloading } = useMutation({
    mutationFn: () => downloadCode(projectId, projectName),
    onError: () => notify('error', t('launch_error_generic')),
  });
  const isGoingLive = _.includes(['registering_domain', 'waiting_dns', 'deploying', 'failed', 'live'], status.stage);
  const canRedeploy = status.access.can_host && !!status.domain?.servable && !status.deployment.deploying;
  const planName = status.plan ? t(`launch_plan_${status.plan.plan}`) : '';

  return (
    <div className='flex flex-col gap-5' data-component='launch-state'>
      {isGoingLive && <LaunchProgress status={status} />}
      {status.stage === 'finish_domain' && (
        <div className='flex flex-col gap-3'>
          <p className='text-sm'>{t('launch_finish_domain_body')}</p>
          <Button className='self-start' onClick={() => onLaunch('domain')} data-action='finish-domain'>{t('launch_finish_domain')}</Button>
        </div>
      )}
      {status.stage === 'choose_domain' && (
        <div className='flex flex-col gap-3'>
          <p className='text-sm'>
            {status.launch?.domain_failure
              ? t('launch_domain_failed', { domain: status.launch.domain_failure.domain })
              : t('launch_choose_domain_body')}
          </p>
          <Button className='self-start' onClick={() => onLaunch('domain')} data-action='choose-domain'>{t('launch_choose_domain')}</Button>
        </div>
      )}
      {(status.stage === 'code_only' || status.stage === 'ended') && (
        <div className='flex flex-col gap-3'>
          <p className='text-sm'>{t(status.stage === 'ended' ? 'launch_ended_body' : 'launch_owned_code_note')}</p>
          <Button className='self-start' onClick={() => onLaunch('new')} data-action='host-it'>{t('launch_cta')}</Button>
        </div>
      )}

      <dl className='grid grid-cols-[minmax(6rem,max-content)_1fr] gap-x-4 gap-y-1.5 text-sm'>
        {status.plan && (
          <>
            <dt className='text-muted-foreground'>{t('launch_review_plan_line', { plan: planName })}</dt>
            <dd>
              {status.plan.ends_at
                ? t('launch_plan_ends', { plan: planName, date: formatDate(status.plan.ends_at) })
                : status.plan.renews_at && t('launch_plan_renews', { plan: planName, date: formatDate(status.plan.renews_at) })}
            </dd>
          </>
        )}
        {status.access.edit_until && (
          <>
            <dt className='text-muted-foreground'>{t('launch_plan_one_time')}</dt>
            <dd>{t('launch_edits_until', { date: formatDate(status.access.edit_until) })}</dd>
          </>
        )}
        {status.domain && (
          <>
            <dt className='text-muted-foreground'>{t('launch_domain_label')}</dt>
            <dd className='break-all'>{status.domain.domain}</dd>
          </>
        )}
      </dl>

      <div className='flex flex-wrap gap-2'>
        {status.access.can_host && status.domain && (
          <Button variant='outline' disabled={!canRedeploy || isRedeploying} onClick={() => redeploy()} data-action='redeploy'>
            {isRedeploying && <Spinner data-icon='inline-start' />}
            {t('launch_redeploy')}
          </Button>
        )}
        {status.access.can_download && (
          <Button variant='outline' disabled={isDownloading} onClick={() => download()} data-action='download-code'>
            {isDownloading && <Spinner data-icon='inline-start' />}
            {t('launch_download_code')}
          </Button>
        )}
      </div>
    </div>
  );
}
