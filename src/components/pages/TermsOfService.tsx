import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { PATHS } from 'src/utils/constants';

// Bump this whenever the terms change. A fixed date (not "today") so the page doesn't claim a fresh update on
// every visit. Month is 0-based.
const LAST_UPDATED = new Date(2026, 9, 25);

// Where people write to about their account and these terms. Shown in the text, so changing it here changes it
// everywhere.
const TERMS_CONTACT_EMAIL = 'support@biveit.com';

// Keep these in step with how the product actually works and is sold:
// - what's paid for, and when: PRICING in utils/constants (the Pricing page reads it too)
// - the AI, and what happens to people's data: the Privacy Policy (PrivacyPolicy.tsx)
// - minimum age: the same 16 as the Privacy Policy's "Children" section
// A section can end with a link to another page.
const SECTIONS: { titleKey: string; bodyKey: string; link?: { to: string; labelKey: string } }[] = [
  { titleKey: 'terms_account_title', bodyKey: 'terms_account_body' },
  { titleKey: 'terms_service_title', bodyKey: 'terms_service_body' },
  { titleKey: 'terms_content_title', bodyKey: 'terms_content_body' },
  { titleKey: 'terms_ai_title', bodyKey: 'terms_ai_body', link: { to: PATHS.privacyPolicy, labelKey: 'privacy_policy_title' } },
  { titleKey: 'terms_use_title', bodyKey: 'terms_use_body' },
  { titleKey: 'terms_payments_title', bodyKey: 'terms_payments_body', link: { to: PATHS.pricing, labelKey: 'pricing_nav' } },
  { titleKey: 'terms_domains_title', bodyKey: 'terms_domains_body' },
  { titleKey: 'terms_ending_title', bodyKey: 'terms_ending_body' },
  { titleKey: 'terms_availability_title', bodyKey: 'terms_availability_body' },
  { titleKey: 'terms_liability_title', bodyKey: 'terms_liability_body' },
  { titleKey: 'terms_changes_title', bodyKey: 'terms_changes_body' },
  { titleKey: 'terms_contact_title', bodyKey: 'terms_contact_body' },
];

// Original purpose: the Terms of Service page, linked from the footers and the sign-up / log-in screens. Laid
// out like the Privacy Policy page.
const TermsOfService = () => {
  const { t, i18n } = useTranslation();
  // No escaping: React already escapes text, and i18next's would show a date's slashes as &#x2F;.
  const textValues = {
    email: TERMS_CONTACT_EMAIL,
    date: LAST_UPDATED.toLocaleDateString(i18n.resolvedLanguage),
    interpolation: { escapeValue: false },
  };

  return (
    <div data-page='terms-of-service' className='mx-auto max-w-3xl'>
      <div className='py-4'>
        <h1 className='mb-4 font-heading text-3xl font-bold tracking-[-0.03em]'>
          {t('terms_title')}
        </h1>

        <p className='mb-6 text-muted-foreground'>
          {t('privacy_policy_last_update', textValues)}
        </p>

        <p className='mb-6'>{t('terms_intro', textValues)}</p>

        {SECTIONS.map(section => (
          <section key={section.titleKey} data-sectionid={section.titleKey} className='mb-6'>
            <h2 className='mb-2 text-xl font-semibold'>{t(section.titleKey)}</h2>
            <p className='whitespace-pre-line'>{t(section.bodyKey, textValues)}</p>
            {section.link && (
              <Link to={section.link.to} className='mt-2 inline-block font-medium text-brand-strong underline underline-offset-3'>
                {t(section.link.labelKey)}
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default TermsOfService;
