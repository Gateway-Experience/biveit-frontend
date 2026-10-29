import _ from 'lodash';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';

import FormField from 'src/components/common/FormField';
import { Spinner } from 'src/components/common/Spinner';
import { DnsRecordsTable } from 'src/components/pages/projects/launch/LaunchProgress';
import { Button } from 'src/components/shadui/button';
import { Checkbox } from 'src/components/shadui/checkbox';
import { formatUsd } from 'src/services/pricing';
import type { DnsRecord, DomainChoice, LaunchPlan, PlanKey, Registrant } from 'src/types/launch';

// Intentions: the last screen before paying -- every line with what it costs today, what renews when and for how
// much, the owner details a domain bought through us is registered with, and the terms to agree to. "Continue to
// payment" hands it all over (onPay); the backend checks everything again, so this is what the user sees, not what
// decides. `plan` is null when only a domain is bought (the plan already runs).

type RegistrantFieldKey = keyof Registrant;

const _REGISTRANT_FIELDS: { key: RegistrantFieldKey; labelKey: string; required: boolean; pattern?: RegExp; wide?: boolean }[] = [
  { key: 'first_name', labelKey: 'launch_field_first_name', required: true },
  { key: 'last_name', labelKey: 'launch_field_last_name', required: true },
  { key: 'company_name', labelKey: 'launch_field_company', required: false, wide: true },
  { key: 'address1', labelKey: 'launch_field_address', required: true, wide: true },
  { key: 'city', labelKey: 'launch_field_city', required: true },
  { key: 'state', labelKey: 'launch_field_state', required: true },
  { key: 'zip', labelKey: 'launch_field_zip', required: true },
  { key: 'country', labelKey: 'launch_field_country', required: true, pattern: /^[A-Za-z]{2}$/ },
  { key: 'email', labelKey: 'launch_field_email', required: true, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
  // E.164 once spaces, dots, dashes and brackets are dropped -- the backend drops them the same way and stores +84901234567.
  { key: 'phone', labelKey: 'launch_field_phone', required: true, pattern: /^\+[1-9][\d\s.\-()]{7,20}$/ },
];

// [Pure] A date a whole number of days from now, the way the user's language writes it.
function formatDateIn(days: number, language: string) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString(language);
}

export default function ReviewStep({ plan, plans, domain, ownDomainRecords, isFreeFirstYear, defaultEmail, isPaying, onPay, onBack }: {
  plan: PlanKey | null;
  plans: LaunchPlan[];
  domain: DomainChoice | null;
  ownDomainRecords: DnsRecord[] | null;
  isFreeFirstYear: boolean;
  defaultEmail: string;
  isPaying: boolean;
  onPay: (registrant: Registrant | null) => void;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [hasAgreed, setHasAgreed] = useState(false);
  const isBuyingDomain = domain?.kind === 'buy';
  const { control, handleSubmit } = useForm<Registrant>({
    defaultValues: { ..._.mapValues(_.keyBy(_REGISTRANT_FIELDS, 'key'), () => ''), email: defaultEmail } as Registrant,
  });
  const money = (amount: number) => formatUsd(amount, i18n.language);
  const planInfo = _.find(plans, { key: plan || undefined });
  const domainToday = isBuyingDomain && !isFreeFirstYear ? domain.price_per_year : 0;
  const dueToday = (planInfo?.price_usd || 0) + domainToday;
  const planRenewsInDays = plan === 'yearly' ? 365 : 30;
  const lines = _.compact([
    planInfo && { key: 'plan', label: t('launch_review_plan_line', { plan: t(`launch_plan_${planInfo.key}`) }), today: planInfo.price_usd, regular: null },
    isBuyingDomain && {
      key: 'domain',
      label: t('launch_review_domain_line', { domain: domain.name }),
      today: domainToday,
      regular: isFreeFirstYear ? domain.price_per_year : null,
    },
    domain?.kind === 'own' && { key: 'domain', label: `${t('launch_review_domain_line', { domain: domain.name })}: ${t('launch_review_own_domain')}`, today: 0, regular: null },
  ]);
  const submit = handleSubmit(registrant => onPay(isBuyingDomain ? registrant : null));

  return (
    <form className='flex flex-col gap-4' onSubmit={event => { event.preventDefault(); submit(); }} data-component='launch-review-step'>
      <div className='rounded-2xl border bg-card p-4 text-sm'>
        {_.map(lines, line => (
          <div key={line.key} className='flex justify-between gap-3 py-1.5' data-line={line.key}>
            <span>{line.label}</span>
            <span className='shrink-0'>
              {line.regular !== null && <s className='mr-1.5 text-muted-foreground'>{money(line.regular)}</s>}
              {money(line.today)}
            </span>
          </div>
        ))}
        <div className='mt-2 flex justify-between gap-3 border-t pt-2 font-bold'>
          <span>{t('launch_review_due_today')}</span>
          <span data-total={dueToday}>{money(dueToday)}</span>
        </div>
      </div>

      <div className='text-xs text-muted-foreground'>
        {plan === 'one_time' && <p>{t('launch_review_one_time_note', { date: formatDateIn(planInfo?.edit_days || 30, i18n.language) })}</p>}
        {plan !== 'one_time' && (
          <>
            <p>{t('launch_review_renews')}</p>
            <ul className='mt-1 list-disc pl-5'>
              {planInfo && (
                <li>{t('launch_review_renews_plan', { plan: t(`launch_plan_${planInfo.key}`), price: money(planInfo.price_usd), date: formatDateIn(planRenewsInDays, i18n.language) })}</li>
              )}
              {isBuyingDomain && (
                <li>{t('launch_review_renews_domain', { domain: domain.name, price: money(domain.price_per_year), date: formatDateIn(365, i18n.language) })}</li>
              )}
            </ul>
            <p className='mt-1'>{t('launch_review_cancel_anytime')}</p>
            {planInfo && isBuyingDomain && <p className='mt-1'>{t('launch_review_two_steps')}</p>}
          </>
        )}
      </div>

      {domain?.kind === 'own' && ownDomainRecords && !_.every(ownDomainRecords, 'found') && (
        <div className='rounded-xl border p-3'>
          <p className='mb-2 text-xs text-muted-foreground'>{t('launch_own_not_ready_warning', { domain: domain.name })}</p>
          <DnsRecordsTable records={ownDomainRecords} />
        </div>
      )}

      {isBuyingDomain && (
        <div className='flex flex-col gap-3'>
          <div>
            <h3 className='font-heading font-bold'>{t('launch_registrant_title')}</h3>
            <p className='text-xs text-muted-foreground'>{t('launch_registrant_info')}</p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            {_.map(_REGISTRANT_FIELDS, field => (
              <Controller
                key={field.key}
                name={field.key}
                control={control}
                rules={{ required: field.required, pattern: field.pattern }}
                render={({ field: input, fieldState }) => (
                  <FormField
                    {...input}
                    label={t(field.labelKey)}
                    error={!!fieldState.error}
                    helperText={fieldState.error && t(fieldState.error.type === 'required' ? 'launch_field_required' : 'launch_field_invalid')}
                    className={field.wide ? 'sm:col-span-2' : undefined}
                    data-field={field.key}
                  />
                )}
              />
            ))}
          </div>
        </div>
      )}

      <label className='flex items-start gap-2.5 text-sm'>
        <Checkbox checked={hasAgreed} onCheckedChange={checked => setHasAgreed(!!checked)} className='mt-0.5' data-input='terms' />
        {t('launch_terms_agree')}
      </label>

      <div className='flex justify-between gap-2'>
        <Button type='button' variant='ghost' onClick={onBack} disabled={isPaying}>{t('launch_back')}</Button>
        <Button type='submit' disabled={!hasAgreed || isPaying} data-action='pay'>
          {isPaying && <Spinner data-icon='inline-start' />}
          {t('launch_pay')}
        </Button>
      </div>
    </form>
  );
}
