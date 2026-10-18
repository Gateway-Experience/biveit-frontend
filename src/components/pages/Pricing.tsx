import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { CalendarSyncIcon, CheckIcon, ChevronDownIcon, GlobeIcon, RocketIcon } from 'lucide-react';

import LinkButton from 'src/components/common/LinkButton';
import PriceTag from 'src/components/common/PriceTag';
import { getPriceLabels } from 'src/services/pricing';
import { PATHS } from 'src/utils/constants';

// What publishing gets them — the same list as the Deploy tab (DeployPanel).
const _FEATURE_KEYS = ['deploy_feature_live', 'pricing_feature_domain', 'deploy_feature_hosting', 'deploy_feature_changes'];

// The bill, line by line: what's paid once, what's paid monthly, and what's free.
const _BREAKDOWN = [
  { id: 'once', Icon: RocketIcon, titleKey: 'pricing_once_title', bodyKey: 'pricing_once_body' },
  { id: 'monthly', Icon: CalendarSyncIcon, titleKey: 'pricing_monthly_title', bodyKey: 'pricing_monthly_body' },
  { id: 'domain', Icon: GlobeIcon, titleKey: 'pricing_domain_title', bodyKey: 'pricing_domain_body' },
];

const _FAQS = [
  { id: 'when', questionKey: 'pricing_faq_when_q', answerKey: 'pricing_faq_when_a' },
  { id: 'sale', questionKey: 'pricing_faq_sale_q', answerKey: 'pricing_faq_sale_a', isSaleOnly: true },
  { id: 'domain', questionKey: 'pricing_faq_domain_q', answerKey: 'pricing_faq_domain_a' },
];

// Original purpose: the public /pricing page, linked from the landing page, the app's footer, the
// signed-out sidebar and the Deploy tab.
// Intentions: one plan, said plainly: the one-time price to publish (with the sale while there is one),
// the monthly charge, and the free domain. All amounts come from PRICING (utils/constants), so changing a
// price or ending the sale never means touching this page.
export default function Pricing() {
  const { t, i18n } = useTranslation();
  const prices = getPriceLabels(i18n.language);
  const faqs = _FAQS.filter(faq => !('isSaleOnly' in faq) || prices.isOnSale);

  return (
    <div data-page='pricing' className='flex flex-col gap-10'>
      <div className='text-center'>
        <span className='mb-2 block text-[0.625rem] font-bold tracking-[0.18em] text-muted-foreground uppercase'>
          {t('pricing_eyebrow')}
        </span>
        <h1 className='font-heading text-4xl font-bold tracking-[-0.03em]'>{t('pricing_title')}</h1>
        <p className='mx-auto mt-3 max-w-xl text-muted-foreground'>{t('pricing_subtitle')}</p>
      </div>

      <div className='relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border bg-card p-7 shadow-sm'>
        <span aria-hidden='true' className='pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-primary/10 blur-3xl' />
        <p className='relative font-heading text-lg font-semibold'>{t('pricing_plan_name')}</p>
        <PriceTag size='lg' className='relative mt-3' />
        <ul className='relative mt-6 flex flex-col gap-3 text-sm'>
          {_.map(_FEATURE_KEYS, key => (
            <li key={key} className='flex items-start gap-2.5'>
              <CheckIcon className='mt-0.5 size-4 shrink-0 text-ring' />
              {t(key, prices)}
            </li>
          ))}
        </ul>
        {/* To the projects page, like the landing page's start buttons: after logging in, people land on their list. */}
        <LinkButton href={PATHS.projects} size='lg' className='relative mt-7 w-full'>{t('pricing_cta')}</LinkButton>
        <p className='relative mt-3 text-center text-xs text-muted-foreground'>{t('pricing_cta_note')}</p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {_.map(_BREAKDOWN, item => (
          <div key={item.id} data-pricing-line={item.id} className='rounded-2xl border bg-card p-5'>
            <span className='mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <item.Icon className='size-4.5' />
            </span>
            <p className='font-semibold'>{t(item.titleKey, prices)}</p>
            <p className='mt-1 text-sm text-muted-foreground'>{t(item.bodyKey, prices)}</p>
          </div>
        ))}
      </div>

      <div className='flex flex-col gap-3'>
        <h2 className='font-heading text-xl font-bold'>{t('pricing_faq_title')}</h2>
        {_.map(faqs, faq => (
          <details key={faq.id} data-faqid={faq.id} className='group rounded-2xl border bg-card px-5 py-4 open:shadow-sm'>
            <summary className='flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden'>
              {t(faq.questionKey, prices)}
              <ChevronDownIcon className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180' />
            </summary>
            <p className='mt-2 text-sm text-muted-foreground'>{t(faq.answerKey, prices)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
