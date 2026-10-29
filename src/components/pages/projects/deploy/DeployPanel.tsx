import _ from 'lodash';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { RocketIcon } from 'lucide-react';

import { useNotification } from 'src/components/common/NotificationProvider';
import PlanList from 'src/components/common/PlanList';
import { Spinner } from 'src/components/common/Spinner';
import LaunchSteps from 'src/components/pages/projects/deploy/LaunchSteps';
import SiteShowcase from 'src/components/pages/projects/deploy/SiteShowcase';
import LaunchProgress, { DnsRecordsTable } from 'src/components/pages/projects/launch/LaunchProgress';
import { Button } from 'src/components/shadui/button';
import { DialogDescription, DialogTitle } from 'src/components/shadui/dialog';
import { LAUNCH_QUERY_KEY, activateLaunchDomain, checkOwnDomain, downloadCode, redeploySite } from 'src/services/launch';
import { PLANS } from 'src/services/pricing';
import type { LaunchStatus, OpenLaunchDialog, PlanKey } from 'src/types/launch';
import { PATHS } from 'src/utils/constants';

// The celebration's blocks come in one after another, once the pop-up itself has risen into place.
// `both` keeps each one hidden during its delay instead of flashing in first.
const _ENTER_CLASS = 'animate-in fade-in-0 slide-in-from-bottom-3 duration-500 ease-out [animation-fill-mode:both]';

const _BEST_VALUE_PLAN: PlanKey = _.find(PLANS, 'isBestValue')?.id || 'yearly';

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
// In the tab, the offer fills the pane: their site in a browser window going live (SiteShowcase), the plans, and what
// happens next (LaunchSteps). The pop-up's plan list is as wide as the tab's (its frame is sized for that,
// SiteReadyModal), so the two read the same, row for row. Fills whatever box it's given; scrolls when it's taller.
export default function DeployPanel({ variant = 'tab', projectId, projectName, sitePictureUrl = null, status, onLaunch, className }: {
  variant?: 'tab' | 'celebration';
  projectId: number;
  projectName: string;
  // The site's latest snapshot, for the tab's showcase; null before there is one.
  sitePictureUrl?: string | null;
  // Undefined while loading.
  status?: LaunchStatus;
  onLaunch: OpenLaunchDialog;
  className?: string;
}) {
  const isCelebration = variant === 'celebration';
  const showsOffer = isCelebration || status?.stage === 'not_paid';

  return (
    // A column, so the content can grow to the pane's full height (and still scroll once it's taller).
    <div data-component='deploy-panel' data-variant={variant} data-stage={status?.stage} className={cn('flex min-h-0 flex-col overflow-y-auto', className)}>
      <div className={cn('mx-auto flex w-full shrink-0 grow flex-col', isCelebration ? 'max-w-xl gap-7 px-6 pt-12 pb-10 sm:px-8' : 'max-w-xl gap-5 px-5 py-6')}>
        {!isCelebration && !status && <div className='flex justify-center py-10'><Spinner className='size-5 text-muted-foreground' /></div>}
        {showsOffer && isCelebration && <LaunchOffer isCelebration canBuyCode={!status?.access.can_download} onLaunch={plan => onLaunch('new', { plan })} />}
        {/* The tab's offer: the showcase and plans together, what happens next pushed to the bottom. */}
        {showsOffer && !isCelebration && (
          <div className='flex grow flex-col justify-between gap-8'>
            <LaunchOffer
              isCelebration={false}
              showcase={<SiteShowcase projectName={projectName} pictureUrl={sitePictureUrl} className='mx-auto max-w-[16rem] sm:mx-0 sm:w-56 sm:shrink-0' />}
              canBuyCode={!status?.access.can_download}
              onLaunch={plan => onLaunch('new', { plan })}
            />
            <LaunchSteps />
          </div>
        )}
        {!showsOffer && status && <LaunchState projectId={projectId} projectName={projectName} status={status} onLaunch={onLaunch} />}
      </div>
    </div>
  );
}

// The plans are a choice here, best value picked to start with; launching carries the pick into the dialog.
// `canBuyCode`: false once the code's been bought, which leaves just the plans that put the site online.
// `showcase` (the tab only): the picture of their site going live, beside the headline where there's room, above it
// otherwise.
function LaunchOffer({ isCelebration, showcase, canBuyCode, onLaunch }: {
  isCelebration: boolean;
  showcase?: React.ReactNode;
  canBuyCode: boolean;
  onLaunch: (plan: PlanKey) => void;
}) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(_BEST_VALUE_PLAN);
  // Each block's entrance, only when celebrating.
  const enter = (order: number) => (isCelebration ? { className: _ENTER_CLASS, style: _getEnterStyle(order) } : {});
  const Title = isCelebration ? DialogTitle : 'h2';
  const Description = isCelebration ? DialogDescription : 'p';

  return (
    <>
      <div className={cn('text-center', showcase && 'flex flex-col items-center gap-4 sm:flex-row sm:gap-6 sm:text-left')}>
        {showcase}
        {/* The pop-up's rocket; in the tab, the showcase does that job. */}
        {isCelebration && (
          <div className='mx-auto mb-5 flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg animate-in fade-in-0 zoom-in-50 spin-in-12 duration-500 ease-out [animation-fill-mode:both] [animation-delay:150ms]'>
            <RocketIcon className='size-8' />
          </div>
        )}
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
          <PlanList selectedPlanId={selectedPlan} onSelect={setSelectedPlan} hiddenPlanIds={canBuyCode ? [] : ['one_time']} />
          <Button size='lg' className='mt-5 w-full' onClick={() => onLaunch(selectedPlan)} data-action='launch' data-plan={selectedPlan}>
            {t('launch_cta')}
          </Button>
          {/* A new tab: this sits in the project workspace (or its celebration pop-up), which shouldn't be left. */}
          <Link to={PATHS.pricing} target='_blank' className='mt-3 block text-center text-xs text-muted-foreground hover:text-foreground hover:underline'>
            {t('pricing_see_details')}
          </Link>
        </div>
      </div>
    </>
  );
}

function LaunchState({ projectId, projectName, status, onLaunch }: {
  projectId: number;
  projectName: string;
  status: LaunchStatus;
  onLaunch: OpenLaunchDialog;
}) {
  const { t, i18n } = useTranslation();
  const notify = useNotification();
  const formatDate = (date: string) => new Date(date).toLocaleDateString(i18n.language);
  // Dates go into translations unescaped: React escapes what it renders, and i18next's own escaping would show
  // their slashes as &#x2F;.
  const unescaped = { interpolation: { escapeValue: false } };
  const { mutate: redeploy, isPending: isRedeploying } = useMutation({
    mutationFn: () => redeploySite(projectId),
    onSuccess: () => notify('success', t('launch_redeploy_started')),
    onError: error => {
      const until = _.get(error, 'data.until');
      notify('error', until ? t('launch_redeploy_cooldown', { time: new Date(until).toLocaleTimeString(i18n.language), ...unescaped }) : t('launch_error_generic'));
    },
  });
  const { mutate: download, isPending: isDownloading } = useMutation({
    mutationFn: () => downloadCode(projectId, projectName),
    onError: () => notify('error', t('launch_error_generic')),
  });
  const queryClient = useQueryClient();
  // The one domain whose DNS records are showing (opened by hand, or by a switch refused for missing records).
  const [recordsDomain, setRecordsDomain] = useState<string | null>(null);
  const { mutate: activateDomain, isPending: isActivating, variables: activatingDomain } = useMutation({
    mutationFn: (domain: string) => activateLaunchDomain(projectId, domain),
    onSuccess: (_result, domain) => {
      notify('success', t('launch_domain_switching', { domain }));
      queryClient.invalidateQueries({ queryKey: [LAUNCH_QUERY_KEY, projectId] });
    },
    onError: (error, domain) => {
      const code: string = _.get(error, 'data.detail') || '';
      notify('error', t(`launch_error_${code}`, { domain, defaultValue: t('launch_error_generic') }));
      if (code === 'DOMAIN_NOT_VERIFIED') {
        setRecordsDomain(domain);
      }
    },
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
                ? t('launch_plan_ends', { date: formatDate(status.plan.ends_at), ...unescaped })
                : status.plan.renews_at && t('launch_plan_renews', { date: formatDate(status.plan.renews_at), ...unescaped })}
            </dd>
          </>
        )}
        {status.access.edit_until && (
          <>
            <dt className='text-muted-foreground'>{t('launch_plan_one_time')}</dt>
            <dd>{t('launch_edits_until', { date: formatDate(status.access.edit_until), ...unescaped })}</dd>
          </>
        )}
      </dl>

      {status.access.can_host && !_.isEmpty(status.site_domains) && (
        <div className='flex flex-col gap-2' data-component='launch-domains'>
          <h3 className='text-sm font-medium text-muted-foreground'>{t('launch_domains_title')}</h3>
          {_.map(status.site_domains, row => (
            <div key={row.domain} className='flex flex-col gap-2 rounded-xl border px-3 py-2 text-sm' data-domain={row.domain} data-active={row.active}>
              <div className='flex items-center justify-between gap-3'>
                <span className='min-w-0 break-all'>{row.domain}</span>
                {row.active
                  ? <span className='shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>{t('launch_domain_active')}</span>
                  : (
                    <span className='flex shrink-0 items-center gap-1'>
                      {row.kind === 'external' && (
                        <Button variant='ghost' size='sm' onClick={() => setRecordsDomain(recordsDomain === row.domain ? null : row.domain)} data-action='toggle-records'>
                          {t(recordsDomain === row.domain ? 'launch_domain_hide_records' : 'launch_domain_show_records')}
                        </Button>
                      )}
                      <Button variant='ghost' size='sm' disabled={isActivating} onClick={() => activateDomain(row.domain)} data-action='use-domain'>
                        {isActivating && activatingDomain === row.domain && <Spinner data-icon='inline-start' />}
                        {t('launch_domain_use')}
                      </Button>
                    </span>
                  )}
              </div>
              {recordsDomain === row.domain && !row.active && (
                <OwnDomainRecords
                  projectId={projectId}
                  domain={row.domain}
                  movesByItself={status.launch?.domain?.kind === 'own' && status.launch.domain.name === row.domain}
                />
              )}
            </div>
          ))}
          <Button variant='link' size='sm' className='self-start px-0' onClick={() => onLaunch('domain')} data-action='add-domain'>
            {t('launch_domain_add')}
          </Button>
        </div>
      )}

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

// The DNS records an attached domain of the user's own still needs before the site can move to it, re-checked
// while they're showing. Original purpose: the Launch tab's domain list, for a domain that isn't the active one.
// `movesByItself`: it's the domain the launch chose, which the backend switches to once its records are found;
// any other one waits for "Use this domain".
const _RECORDS_RECHECK_MS = 30000;

function OwnDomainRecords({ projectId, domain, movesByItself }: { projectId: number; domain: string; movesByItself: boolean }) {
  const { t } = useTranslation();
  const { data: check } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'own-domain', domain],
    queryFn: () => checkOwnDomain(projectId, domain),
    refetchInterval: query => (query.state.data?.verified ? false : _RECORDS_RECHECK_MS),
  });
  if (!check) {
    return <Spinner className='size-4 text-muted-foreground' />;
  }
  return (
    <div className='flex flex-col gap-2' data-component='own-domain-records'>
      <p className='text-xs text-muted-foreground'>{t('launch_own_records_intro')}</p>
      <DnsRecordsTable records={check.records} />
      <p className={cn('text-xs', check.verified ? 'text-primary' : 'text-muted-foreground')}>
        {t(check.verified ? 'launch_own_ready' : movesByItself ? 'launch_domain_records_pending' : 'launch_domain_records_pending_switch')}
      </p>
    </div>
  );
}
