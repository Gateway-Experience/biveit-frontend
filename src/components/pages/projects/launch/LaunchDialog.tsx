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
import { Badge } from 'src/components/shadui/badge';
import { Button } from 'src/components/shadui/button';
import { trackEvent } from 'src/services/analytics';
import { LAUNCH_QUERY_KEY, addOwnDomain, chooseSubdomain, downloadCode, getLaunchStatus, startLaunchCheckout } from 'src/services/launch';
import { useStore } from 'src/state-store';
import type { DomainChoice, LaunchStatus, PlanKey, Registrant } from 'src/types/launch';

// Intentions: taking a site live, in one dialog (docs/plans/launch-flow.md in the backend repo): the plan, the
// domain (plans only), review, paying, then watching it go live. `mode`:
//   'new'     a first purchase (or coming back for a plan): plan -> domain -> review. The domain step only when the
//             site has no active or servable domain (one it already has gets used; the user switches later)
//             `initialPlan`, when the plan was picked before opening (the Deploy tab's choice), skips the plan step;
//             going back from the domain still shows it, to change.
//   'domain'  a domain for a running plan (none yet, a failed one replaced, or another one): domain -> review.
// Plan and domain are separate purchases on the backend; this dialog just asks for both in one go. Paying opens the
// provider's checkout for the plan in a new tab, and the dialog follows along by polling the launch status. The
// user's own domain, or a free subdomain of ours, is added right away (nothing to pay). A domain to buy gets its checkout once the plan is paid --
// that's when its free year (yearly) is real -- so it's "step 2 of 2". The choices live here only until then:
// closing the dialog loses the domain choice, and the status then asks for a domain again.

type Step = 'plan' | 'domain' | 'review' | 'paying' | 'progress';

// Quick while paying and building (the user watches); slower while waiting on the user's DNS.
const _STATUS_POLL_MS = 3000;
const _WAITING_DNS_POLL_MS = 30000;

// [Pure] Whether a plan bought now needs a domain picked with it: not when the site already has one it can use (the
// active one, or a servable one fulfilment will set up).
function _needsDomain(status: LaunchStatus): boolean {
  return !status.domain && !_.some(status.site_domains, 'servable');
}

// [Pure] The step after the plan: the code goes straight to review (no domain), the hosted plans to the domain when
// one's needed.
function _getStepAfterPlan(plan: PlanKey, needsDomain: boolean): Step {
  return plan !== 'one_time' && needsDomain ? 'domain' : 'review';
}

// [Pure] Where the dialog opens: past the plan when one's picked already.
function _getFirstStep(mode: 'new' | 'domain', pickedPlan: PlanKey | null, needsDomain: boolean): Step {
  if (mode === 'domain') {
    return 'domain';
  }
  return pickedPlan ? _getStepAfterPlan(pickedPlan, needsDomain) : 'plan';
}

export default function LaunchDialog({ projectId, projectName, open, mode, initialPlan = null, status, onClose, onUnderWay }: {
  projectId: number;
  projectName: string;
  open: boolean;
  mode: 'new' | 'domain';
  initialPlan?: PlanKey | null;
  status: LaunchStatus;
  onClose: () => void;
  // The launch is under way: paid for (or nothing to pay), and the dialog moved on to watching it go live. The page
  // opens its Deploy tab then, so that's where they are once they close the dialog.
  onUnderWay?: () => void;
}) {
  const { t } = useTranslation();
  const notify = useNotification();
  const setStore = useStore(state => state.set);
  const user = useStore(state => state.user);
  // The code can't be bought twice: a picked one-time plan then counts as not picked.
  const startPlan = mode === 'new' && !(initialPlan === 'one_time' && status.access.can_download) ? initialPlan : null;
  // Read when the dialog opens, not live: a status refresh mid-way (a domain turning servable) mustn't restart it.
  const [needsDomain, setNeedsDomain] = useState(() => _needsDomain(status));
  const [step, setStep] = useState<Step>(_getFirstStep(mode, startPlan, needsDomain));
  const [plan, setPlan] = useState<PlanKey | null>(startPlan);
  const [domain, setDomain] = useState<DomainChoice | null>(null);
  // The checkouts opened so far, to open again (the plan's, then the domain's).
  const [checkoutUrls, setCheckoutUrls] = useState<{ plan?: string; domain?: string }>({});

  // A fresh start each time it opens (in the mode it's opened with).
  useEffect(() => {
    if (open) {
      const needsDomainNow = _needsDomain(status);
      setNeedsDomain(needsDomainNow);
      setStep(_getFirstStep(mode, startPlan, needsDomainNow));
      setPlan(startPlan);
      setDomain(null);
      setCheckoutUrls({});
    }
    // Only on opening: `status` is read then, not followed (see needsDomain).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, startPlan]);

  // While paying and going live, follow the status (it also moves the launch along on the server).
  const isFollowing = open && (step === 'paying' || step === 'progress');
  const { data: liveStatus } = useQuery({
    queryKey: [LAUNCH_QUERY_KEY, projectId, 'status'],
    queryFn: () => getLaunchStatus(projectId),
    enabled: isFollowing,
    refetchInterval: query => (isFollowing ? (query.state.data?.stage === 'waiting_dns' ? _WAITING_DNS_POLL_MS : _STATUS_POLL_MS) : false),
  });
  const currentStatus = liveStatus || status;

  // In 'domain' mode the plan was paid before.
  const hasPaidPlan = mode === 'domain' || (plan === 'one_time' ? !!currentStatus.one_time : !!currentStatus.plan);
  // A yearly plan's first domain is free; with the plan running, the backend says whether one still is.
  const hasDomainDiscount = hasPaidPlan ? currentStatus.has_domain_discount : plan === 'yearly';
  const isDiscounted = hasDomainDiscount && domain?.kind === 'buy' && domain.discountable;
  const isDomainToPay = domain?.kind === 'buy' && !currentStatus.domain_subscription;

  // Paying for what's next: the plan if it isn't paid yet (adding the user's own domain or free subdomain on the way),
  // else the domain to buy. Resolves to the checkout opened, or null when there was nothing to pay (just adding one).
  const { mutate: pay, isPending: isStartingCheckout, variables: registrant } = useMutation({
    mutationFn: async (chosenRegistrant: Registrant | null) => {
      if (domain?.kind === 'own') {
        await addOwnDomain(projectId, domain.name);
      }
      if (domain?.kind === 'subdomain') {
        await chooseSubdomain(projectId, domain.slug);
      }
      if (!hasPaidPlan && plan) {
        return startLaunchCheckout(projectId, { plan });
      }
      if (domain?.kind === 'buy' && chosenRegistrant) {
        return startLaunchCheckout(projectId, { domain: { name: domain.name, price_per_year: domain.price_per_year }, registrant: chosenRegistrant });
      }
      return null;
    },
    onSuccess: checkout => {
      if (!checkout) {
        setStep('progress');
        return;
      }
      trackEvent('checkout_started', {
        project_id: projectId,
        product: checkout.product,
        ...(plan ? { plan } : {}),
        ...(domain ? { domain_kind: domain.kind } : {}),
      });
      setCheckoutUrls(urls => ({ ...urls, [checkout.product]: checkout.url }));
      window.open(checkout.url, '_blank');
      setStep('paying');
    },
    onError: error => {
      const code: string = _.get(error, 'data.detail') || '';
      trackEvent('launch_error_shown', { project_id: projectId, code: code || 'UNKNOWN' });
      const pricePerYear = _.get(error, 'data.price_per_year');
      if (code === 'PRICE_CHANGED' && domain?.kind === 'buy' && pricePerYear) {
        setDomain({ ...domain, price_per_year: pricePerYear });
      }
      if (_.includes(['DOMAIN_UNAVAILABLE', 'DOMAIN_TAKEN', 'DOMAIN_NOT_SOLD', 'DOMAIN_OURS', 'DOMAIN_INVALID'], code) || _.startsWith(code, 'SUBDOMAIN_')) {
        setStep('domain');
      }
      // A refusal with its own message, else the generic one.
      notify('error', t(`launch_error_${code}`, { price: pricePerYear, defaultValue: t('launch_error_generic') }));
    },
  });

  useEffect(() => {
    if (open && step === 'progress') {
      onUnderWay?.();
    }
    // Once per arrival at the progress step; the page's callback is remade every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  // Everything's paid for: on to watching it go live.
  useEffect(() => {
    if (step === 'paying' && hasPaidPlan && !isDomainToPay) {
      setStep('progress');
    }
  }, [step, hasPaidPlan, isDomainToPay]);

  const askAgent = () => {
    setStore({ chatPrefill: t('launch_domain_agent_prompt') });
    onClose();
  };
  const chooseDomain = (choice: DomainChoice) => {
    trackEvent('launch_option_selected', { project_id: projectId, step: 'domain', domain_kind: choice.kind, is_preselected: false });
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
        {/* Intentions: a test purchase must never pass for a real one (or the other way round). */}
        {currentStatus.payment_provider === 'polar_sandbox' && (
          <Badge variant='outline' className='mb-3' data-badge='sandbox-payments'>{t('launch_sandbox_payments')}</Badge>
        )}
        {step === 'plan' && (
          <PlanStep
            plans={currentStatus.plans}
            hideOneTime={currentStatus.access.can_download}
            onChoose={chosen => {
              trackEvent('launch_option_selected', { project_id: projectId, step: 'plan', plan: chosen, is_preselected: false });
              setPlan(chosen);
              setStep(_getStepAfterPlan(chosen, needsDomain));
            }}
          />
        )}
        {step === 'domain' && (
          <DomainStep
            projectId={projectId}
            hasDiscount={hasDomainDiscount}
            subdomainParent={currentStatus.subdomain_parent}
            onSwitchToYearly={mode === 'new' && plan === 'monthly'
              ? () => {
                trackEvent('launch_option_selected', { project_id: projectId, step: 'plan', plan: 'yearly', is_preselected: false });
                setPlan('yearly');
              }
              : undefined}
            onAskAgent={askAgent}
            onChoose={chooseDomain}
            onBack={mode === 'new' ? () => setStep('plan') : undefined}
          />
        )}
        {step === 'review' && (
          <ReviewStep
            projectId={projectId}
            projectName={projectName}
            plan={mode === 'domain' ? null : plan}
            plans={currentStatus.plans}
            domain={domain}
            ownDomainRecords={domain?.kind === 'own' ? domain.records : null}
            isDiscounted={!!isDiscounted}
            defaultEmail={user?.username || ''}
            isPaying={isStartingCheckout}
            onPay={pay}
            onBack={() => setStep(domain ? 'domain' : 'plan')}
          />
        )}
        {step === 'paying' && (
          <div className='flex flex-col gap-4 text-sm'>
            {!hasPaidPlan && (
              <>
                <p>{t('launch_paying_body')}</p>
                <div className='flex items-center gap-2 text-muted-foreground'><Spinner className='size-4' />{t('launch_confirming_payment')}</div>
                <Button variant='outline' className='self-start' onClick={() => window.open(checkoutUrls.plan, '_blank')}>
                  {t('launch_pay_open_again')}
                </Button>
              </>
            )}
            {hasPaidPlan && isDomainToPay && (
              <>
                {mode === 'new' && <p className='font-medium'>{t('launch_step_payment')} ✓</p>}
                <p className='font-heading font-bold'>{t('launch_pay_domain_step')}</p>
                {checkoutUrls.domain
                  ? (
                    <>
                      <div className='flex items-center gap-2 text-muted-foreground'><Spinner className='size-4' />{t('launch_confirming_payment')}</div>
                      <Button variant='outline' className='self-start' onClick={() => window.open(checkoutUrls.domain, '_blank')}>
                        {t('launch_pay_open_again')}
                      </Button>
                    </>
                  )
                  : (
                    <Button className='self-start' disabled={isStartingCheckout} onClick={() => pay(registrant ?? null)} data-action='pay-domain'>
                      {isStartingCheckout && <Spinner data-icon='inline-start' />}
                      {t('launch_pay_domain_cta')}
                    </Button>
                  )}
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
