import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';

import Modal from 'src/components/common/Modal';
import { useNotification } from 'src/components/common/NotificationProvider';
import { Spinner } from 'src/components/common/Spinner';
import DomainStep from 'src/components/pages/projects/launch/DomainStep';
import LaunchProgress from 'src/components/pages/projects/launch/LaunchProgress';
import PlanStep from 'src/components/pages/projects/launch/PlanStep';
import ReviewStep from 'src/components/pages/projects/launch/ReviewStep';
import { Button } from 'src/components/shadui/button';
import { LAUNCH_QUERY_KEY, downloadCode, getLaunchStatus, startLaunchCheckout } from 'src/services/launch';
import { useStore } from 'src/state-store';
import type { DomainChoice, LaunchCheckout, LaunchStatus, PlanKey, Registrant } from 'src/types/launch';

// Intentions: taking a site live, in one dialog (docs/plans/launch-flow.md in the backend repo): the plan, the
// domain (plans only), review, paying, then watching it go live. `mode`:
//   'new'     a first purchase (or a code-only buyer coming back for a plan): plan -> domain -> review
//   'domain'  the plan already runs and only a domain is missing: domain -> review. It finishes the plan's launch
//             when that one meant to buy a domain (abandoned or failed), which keeps its free first year.
// Paying opens the provider's checkout in a new tab -- one per thing bought, the plan then the domain (no cart) --
// and the dialog follows along by polling the launch status. The choices live here only, until paid: closing the
// dialog loses nothing on the server.

type Step = 'plan' | 'domain' | 'review' | 'paying' | 'progress';

const _STATUS_POLL_MS = 3000;

export default function LaunchDialog({ projectId, projectName, open, mode, status, onClose }: {
  projectId: number;
  projectName: string;
  open: boolean;
  mode: 'new' | 'domain';
  status: LaunchStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const setStore = useStore(state => state.set);
  const user = useStore(state => state.user);
  const [step, setStep] = useState<Step>(mode === 'domain' ? 'domain' : 'plan');
  const [plan, setPlan] = useState<PlanKey | null>(null);
  const [domain, setDomain] = useState<DomainChoice | null>(null);
  const [checkout, setCheckout] = useState<LaunchCheckout | null>(null);

  // A fresh start each time it opens (in the mode it's opened with).
  useEffect(() => {
    if (open) {
      setStep(mode === 'domain' ? 'domain' : 'plan');
      setPlan(null);
      setDomain(null);
      setCheckout(null);
    }
  }, [open, mode]);

  // While paying and going live, follow the status (it also moves the launch along on the server).
  const isFollowing = open && (step === 'paying' || step === 'progress');
  const { data: liveStatus } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'status'],
    queryFn: () => getLaunchStatus(projectId),
    enabled: isFollowing,
    refetchInterval: isFollowing ? _STATUS_POLL_MS : false,
  });
  const currentStatus = liveStatus || status;

  // The launch this finishes, in 'domain' mode: the plan's, if it set out to buy a domain.
  const finishingLaunchId = mode === 'domain' && currentStatus.launch?.domain?.kind === 'buy' ? currentStatus.launch.launch_id : null;
  const launchPlan = mode === 'domain' ? (finishingLaunchId ? currentStatus.launch?.plan : null) : plan;
  const isFreeFirstYear = launchPlan === 'yearly' && domain?.kind === 'buy' && domain.free_first_year_eligible;

  const { mutate: pay, isPending: isStartingCheckout } = useMutation({
    mutationFn: (registrant: Registrant | null) => startLaunchCheckout(projectId, {
      plan: mode === 'domain' ? null : plan,
      domain: domain && (domain.kind === 'buy' ? { kind: 'buy', name: domain.name, price_per_year: domain.price_per_year } : { kind: 'own', name: domain.name }),
      registrant,
      launchId: finishingLaunchId,
    }),
    onSuccess: result => {
      setCheckout(result);
      const first = _.first(result.checkouts);
      if (first) {
        window.open(first.url, '_blank');
        setStep('paying');
      } else {
        // Switching to the user's own domain on a running plan: nothing to pay.
        setStep('progress');
      }
    },
    onError: error => {
      const code: string = _.get(error, 'data.detail') || '';
      const pricePerYear = _.get(error, 'data.price_per_year');
      if (code === 'PRICE_CHANGED' && domain?.kind === 'buy' && pricePerYear) {
        setDomain({ ...domain, price_per_year: pricePerYear });
      }
      if (code === 'DOMAIN_UNAVAILABLE' || code === 'DOMAIN_TAKEN') {
        setStep('domain');
      }
      // A refusal with its own message, else the generic one.
      notify('error', t(`launch_error_${code}`, { price: pricePerYear, defaultValue: t('launch_error_generic') }));
    },
  });

  // In 'domain' mode the plan was paid before.
  const hasPaidPlan = mode === 'domain' || (plan === 'one_time' ? !!currentStatus.one_time : !!currentStatus.plan);
  const domainCheckout = _.find(checkout?.checkouts, { product: 'domain' });
  const isDomainCheckoutPending = !!domainCheckout && !currentStatus.domain_subscription;
  // Everything's paid for: on to watching it go live.
  useEffect(() => {
    if (step === 'paying' && hasPaidPlan && !isDomainCheckoutPending) {
      setStep('progress');
    }
  }, [step, hasPaidPlan, isDomainCheckoutPending]);

  const askAgent = () => {
    setStore({ chatPrefill: t('launch_domain_agent_prompt') });
    onClose();
  };
  const chooseDomain = (choice: DomainChoice) => {
    setDomain(choice);
    setStep('review');
  };

  const title = {
    plan: t('launch_plan_title'),
    domain: t('launch_domain_title'),
    review: t('launch_review_title'),
    paying: t('launch_paying_title'),
    progress: null,
  }[step];

  return (
    <Modal open={open} onClose={onClose} title={title} size='xl' fullScreenMobile={false}>
      <div data-component='launch-dialog' data-step={step} data-projectid={projectId}>
        {step === 'plan' && (
          <PlanStep
            plans={currentStatus.plans}
            hideOneTime={currentStatus.access.can_download}
            onChoose={chosen => {
              setPlan(chosen);
              setStep(chosen === 'one_time' ? 'review' : 'domain');
            }}
          />
        )}
        {step === 'domain' && (
          <DomainStep
            projectId={projectId}
            freeFirstYear={launchPlan === 'yearly'}
            onSwitchToYearly={mode === 'new' && plan === 'monthly' ? () => setPlan('yearly') : undefined}
            onAskAgent={askAgent}
            onChoose={chooseDomain}
            onBack={mode === 'new' ? () => setStep('plan') : undefined}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            plan={mode === 'domain' ? null : plan}
            plans={currentStatus.plans}
            domain={domain}
            ownDomainRecords={domain?.kind === 'own' ? domain.records : null}
            isFreeFirstYear={!!isFreeFirstYear}
            defaultEmail={user?.username || ''}
            isPaying={isStartingCheckout}
            onPay={pay}
            onBack={() => setStep(plan === 'one_time' ? 'plan' : 'domain')}
          />
        )}
        {step === 'paying' && (
          <div className='flex flex-col gap-4 text-sm'>
            {!hasPaidPlan && (
              <>
                <p>{t('launch_paying_body')}</p>
                <div className='flex items-center gap-2 text-muted-foreground'><Spinner className='size-4' />{t('launch_confirming_payment')}</div>
                <Button variant='outline' className='self-start' onClick={() => window.open(_.first(checkout?.checkouts)?.url, '_blank')}>
                  {t('launch_pay_open_again')}
                </Button>
              </>
            )}
            {hasPaidPlan && isDomainCheckoutPending && domainCheckout && (
              <>
                <p className='font-medium'>{t('launch_step_payment')} ✓</p>
                <p className='font-heading font-bold'>{t('launch_pay_domain_step')}</p>
                <Button className='self-start' onClick={() => window.open(domainCheckout.url, '_blank')} data-action='pay-domain'>
                  {t('launch_pay_domain_cta')}
                </Button>
              </>
            )}
          </div>
        )}
        {step === 'progress' && (
          currentStatus.stage === 'code_only'
            ? (
              <div className='flex flex-col gap-4'>
                <h3 className='font-heading text-lg font-bold'>{t('launch_code_thanks')}</h3>
                <Button className='self-start' onClick={() => downloadCode(projectId, projectName).catch(() => notify('error', t('launch_error_generic')))} data-action='download-code'>
                  {t('launch_download_code')}
                </Button>
              </div>
            )
            : (
              <div className='flex flex-col gap-4'>
                <LaunchProgress status={currentStatus} />
                {currentStatus.stage !== 'live' && <p className='text-xs text-muted-foreground'>{t('launch_close_hint')}</p>}
              </div>
            )
        )}
      </div>
    </Modal>
  );
}
