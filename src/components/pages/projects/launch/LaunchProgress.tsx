import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CheckIcon, CircleIcon, ExternalLinkIcon, XIcon } from 'lucide-react';

import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import type { DnsRecord, LaunchStatus } from 'src/types/launch';

// Intentions: a launch's way to going live as a checklist -- payment, the domain, building the site, live -- read
// off the backend's status (and its stage), so the dialog after paying and the Launch tab show the same thing.
// A step is done, in progress (spinner), failed, or still to come.

type StepState = 'done' | 'active' | 'failed' | 'todo';

// [Pure] The checklist for a status: [{key, label, state}], in order.
function getLaunchSteps(status: LaunchStatus, t: (key: string, params?: Record<string, unknown>) => string) {
  const domainName = status.domain?.domain || status.domain_subscription?.domain || status.launch?.domain?.name || '';
  const isOwnDomain = status.domain?.kind === 'external' || status.launch?.domain?.kind === 'own';
  const order = ['registering_domain', 'waiting_dns', 'deploying', 'live'];
  // A failed deployment got as far as deploying: the steps before it are done, that one failed.
  const isFailed = status.stage === 'failed';
  const reached = _.indexOf(order, isFailed ? 'deploying' : status.stage);
  const stateOf = (index: number): StepState => {
    if (reached > index || status.stage === 'live') {
      return 'done';
    }
    if (reached === index) {
      return isFailed ? 'failed' : 'active';
    }
    return 'todo';
  };
  const domainStep = isOwnDomain
    ? { key: 'domain', label: stateOf(1) === 'done' ? t('launch_step_domain_connected', { domain: domainName }) : t('launch_step_waiting_dns'), state: stateOf(1) }
    : { key: 'domain', label: t(stateOf(0) === 'done' ? 'launch_step_domain_registered' : 'launch_step_domain_registering', { domain: domainName }), state: stateOf(0) };
  return [
    { key: 'payment', label: t('launch_step_payment'), state: 'done' as StepState },
    domainStep,
    { key: 'build', label: t('launch_step_building'), state: stateOf(2) },
    { key: 'live', label: t('launch_step_live'), state: status.stage === 'live' ? 'done' as StepState : 'todo' as StepState },
  ];
}

export function DnsRecordsTable({ records }: { records: DnsRecord[] }) {
  const { t } = useTranslation();
  const hasRecordsToRemove = _.some(records, { action: 'remove' });
  return (
    <div className='flex flex-col gap-2'>
      <table className='w-full text-left text-xs' data-component='dns-records'>
        <tbody>
          {_.map(records, record => (
            <tr key={`${record.type}-${record.value}`} className='border-b align-top last:border-0' data-recordtype={record.type} data-action={record.action}>
              <td className='py-2 pr-3 font-mono font-semibold'>{record.type}</td>
              <td className='py-2 pr-3 font-mono break-all'>{record.name}</td>
              <td className={cn('py-2 pr-3 font-mono break-all', record.action === 'remove' && 'line-through')}>{record.value}</td>
              {record.action === 'remove'
                ? <td className='py-2 whitespace-nowrap text-destructive'>{t('launch_own_remove')}</td>
                : (
                  <td className={cn('py-2 whitespace-nowrap', record.found ? 'text-primary' : 'text-muted-foreground')}>
                    {record.found ? t('launch_own_found') : t('launch_own_not_yet')}
                  </td>
                )}
            </tr>
          ))}
        </tbody>
      </table>
      {hasRecordsToRemove && <p className='text-xs text-destructive'>{t('launch_own_remove_aaaa_note')}</p>}
    </div>
  );
}

export default function LaunchProgress({ status }: { status: LaunchStatus }) {
  const { t } = useTranslation();
  const steps = getLaunchSteps(status, t);
  const siteUrl = _.first(status.deployment.urls);
  const isLive = status.stage === 'live';

  return (
    <div className='flex flex-col gap-4' data-component='launch-progress' data-stage={status.stage}>
      <h3 className='font-heading text-lg font-bold'>{t(isLive ? 'launch_live_title' : 'launch_progress_title')}</h3>
      <ol className='flex flex-col gap-2.5 text-sm'>
        {_.map(steps, step => (
          <li key={step.key} className={cn('flex items-center gap-2.5', step.state === 'todo' && 'text-muted-foreground')} data-step={step.key} data-state={step.state}>
            {step.state === 'done' && <CheckIcon className='size-4 shrink-0 text-primary' />}
            {step.state === 'active' && <Spinner className='size-4 shrink-0' />}
            {step.state === 'failed' && <XIcon className='size-4 shrink-0 text-destructive' />}
            {step.state === 'todo' && <CircleIcon className='size-4 shrink-0' />}
            {step.label}
          </li>
        ))}
      </ol>
      {status.stage === 'waiting_dns' && status.domain?.check && (
        <div className='rounded-xl border p-3'>
          <p className='mb-2 text-xs text-muted-foreground'>{t('launch_own_records_intro')}</p>
          <DnsRecordsTable records={status.domain.check.records} />
        </div>
      )}
      {status.stage === 'failed' && <p className='text-sm text-destructive'>{t('launch_deploy_failed')}</p>}
      {isLive && siteUrl && (
        <Button onClick={() => window.open(siteUrl, '_blank', 'noopener')} data-action='open-site'>
          {t('launch_open_site')}
          <ExternalLinkIcon data-icon='inline-end' />
        </Button>
      )}
    </div>
  );
}
