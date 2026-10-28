import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { CheckIcon, ChevronDownIcon, GlobeIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import { getPriceLabels, PLANS } from 'src/services/pricing';
import { PATHS, SUPPORT_EMAIL } from 'src/utils/constants';

const _FAQS = [
  { id: 'when', questionKey: 'pricing_faq_when_q', answerKey: 'pricing_faq_when_a' },
  { id: 'difference', questionKey: 'pricing_faq_difference_q', answerKey: 'pricing_faq_difference_a' },
  { id: 'domain', questionKey: 'pricing_faq_domain_q', answerKey: 'pricing_faq_domain_a' },
  { id: 'own-domain', questionKey: 'pricing_faq_own_domain_q', answerKey: 'pricing_faq_own_domain_a' },
  { id: 'human', questionKey: 'pricing_faq_human_q', answerKey: 'pricing_faq_human_a' },
];

// Original purpose: the public /pricing page, linked from the landing page, the app's footer, the
// signed-out sidebar and the Deploy tab.
// Intentions: the three ways to pay side by side (PLANS, services/pricing): just the code once, or a monthly or
// yearly subscription where we put the site online. A subscription's domain is its own item on top, so each
// subscription card says what the domain costs on it. All amounts come from PRICING (utils/constants), so changing a
// price never means touching this page.
export default function Pricing() {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);
  const faqValues = { ...prices, email: SUPPORT_EMAIL };

  return (
    <div data-page='pricing' className='flex flex-col gap-10'>
      <div className='text-center'>
        <span className='mb-2 block text-[0.625rem] font-bold tracking-[0.18em] text-muted-foreground uppercase'>
          {t('pricing_eyebrow')}
        </span>
        <h1 className='font-heading text-4xl font-bold tracking-[-0.03em]'>{t('pricing_title')}</h1>
        <p className='mx-auto mt-3 max-w-xl text-muted-foreground'>{t('pricing_subtitle')}</p>
      </div>

      {/* The cards share one grid's rows (subgrid): name, tagline, price, note, benefits and domain each line up
          across the cards, however much text one of them wraps onto. No row gap: the spacing is each part's own
          margin, so the rows a card leaves empty (no note, no domain) stay flush. */}
      <div className='grid grid-cols-1 gap-x-4 md:grid-cols-3'>
        {_.map(PLANS, plan => (
          <div
            key={plan.id}
            data-plan={plan.id}
            className={cn(
              'relative row-span-6 grid grid-rows-subgrid overflow-hidden rounded-3xl border bg-card p-6 shadow-sm max-md:mb-4',
              plan.isBestValue && 'border-primary ring-1 ring-primary',
            )}
          >
            {plan.isBestValue && (
              <>
                <span aria-hidden='true' className='pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-primary/10 blur-3xl' />
                <span className='absolute top-5 right-5 rounded-full bg-primary px-2.5 py-0.5 text-[0.6875rem] font-bold tracking-[0.06em] text-primary-foreground uppercase'>
                  {t('pricing_best_value')}
                </span>
              </>
            )}
            <p className='relative font-heading text-lg font-semibold'>{t(plan.nameKey)}</p>
            <p className='relative mt-1 text-sm text-muted-foreground'>{t(plan.taglineKey)}</p>
            <div className='relative mt-5 flex items-baseline gap-1.5'>
              <span className='font-heading text-4xl font-bold tracking-[-0.03em]'>{prices[plan.priceParam]}</span>
              <span className='text-sm text-muted-foreground'>{t(plan.periodKey)}</span>
            </div>
            {/* Rendered even when empty, as are the list and the domain: each card fills all six rows. */}
            <p className='relative mt-1 text-sm font-medium text-ring'>{plan.noteKey && t(plan.noteKey, prices)}</p>
            <ul className='relative mt-5 flex flex-col gap-3 text-sm'>
              {_.map(plan.featureKeys, key => (
                <li key={key} className='flex items-start gap-2.5'>
                  <CheckIcon className='mt-0.5 size-4 shrink-0 text-ring' />
                  {t(key, prices)}
                </li>
              ))}
            </ul>
            {plan.domainKey ? (
              <p data-plan-domain className='relative mt-5 flex items-start gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground'>
                <GlobeIcon className='mt-0.5 size-4 shrink-0' />
                {t(plan.domainKey, prices)}
              </p>
            ) : <div />}
          </div>
        ))}
      </div>

      {/* To the projects page, like the landing page's start buttons: after logging in, people land on their list. */}
      <div className='mx-auto flex w-full max-w-sm flex-col items-center'>
        <LinkButton href={PATHS.projects} size='lg' className='w-full'>{t('pricing_cta')}</LinkButton>
        <p className='mt-3 text-center text-xs text-muted-foreground'>{t('pricing_cta_note')}</p>
      </div>

      <div className='flex flex-col gap-3'>
        <h2 className='font-heading text-xl font-bold'>{t('pricing_faq_title')}</h2>
        {_.map(_FAQS, faq => (
          <details key={faq.id} data-faqid={faq.id} className='group rounded-2xl border bg-card px-5 py-4 open:shadow-sm'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden'>
              {t(faq.questionKey, faqValues)}
              <ChevronDownIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180' />
            </summary>
            <p className='mt-2 text-sm text-muted-foreground'>{t(faq.answerKey, faqValues)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
