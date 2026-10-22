import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { PATHS } from 'src/utils/constants';

// Bump this whenever the policy text changes. A fixed date (not "today") so the page doesn't claim a
// fresh update on every visit. Month is 0-based.
const LAST_UPDATED = new Date(2026, 9, 21);

// Where people write to about their data. Shown in the text, so changing it here changes it everywhere.
const PRIVACY_CONTACT_EMAIL = 'privacy@biveit.com';

// Keep these in step with what the product actually does with data (vib3-backend):
// - accounts: migrations/0001_users.sql (email, name, bcrypt hash, Google `sub` but no Google tokens, picture,
//   language; guests; soft-delete only, nothing is hard-deleted), services/users/
// - projects and chats: migrations/0005-0008, files on the server under STORAGE_DIR
// - the AI: services/agent (Claude, by Anthropic)
// - AWS: utils/aws/s3 (uploads), utils/aws/ses (password reset emails)
// - analytics: the FE's services/analytics (Mixpanel, only with consent; see CookiePolicy)
// A section can end with a link to another page.
const SECTIONS: { titleKey: string; bodyKey: string; link?: { to: string; labelKey: string } }[] = [
  { titleKey: 'privacy_policy_collect_title', bodyKey: 'privacy_policy_collect_body' },
  { titleKey: 'privacy_policy_use_title', bodyKey: 'privacy_policy_use_body' },
  { titleKey: 'privacy_policy_ai_title', bodyKey: 'privacy_policy_ai_body' },
  { titleKey: 'privacy_policy_share_title', bodyKey: 'privacy_policy_share_body' },
  { titleKey: 'privacy_policy_cookies_title', bodyKey: 'privacy_policy_cookies_body', link: { to: PATHS.cookiePolicy, labelKey: 'cookie_policy_title' } },
  { titleKey: 'privacy_policy_security_title', bodyKey: 'privacy_policy_security_body' },
  { titleKey: 'privacy_policy_keep_title', bodyKey: 'privacy_policy_keep_body' },
  { titleKey: 'privacy_policy_rights_title', bodyKey: 'privacy_policy_rights_body' },
  { titleKey: 'privacy_policy_children_title', bodyKey: 'privacy_policy_children_body' },
  { titleKey: 'privacy_policy_changes_title', bodyKey: 'privacy_policy_changes_body' },
  { titleKey: 'privacy_policy_contact_title', bodyKey: 'privacy_policy_contact_body' },
];

const PrivacyPolicy = () => {
  const { t, i18n } = useTranslation();
  // No escaping: React already escapes text, and i18next's would show a date's slashes as &#x2F;.
  const textValues = {
    email: PRIVACY_CONTACT_EMAIL,
    date: LAST_UPDATED.toLocaleDateString(i18n.resolvedLanguage),
    interpolation: { escapeValue: false },
  };

  return (
    <div className='mx-auto max-w-3xl'>
      <div className='py-4'>
        <h1 className='mb-4 font-heading text-3xl font-bold tracking-[-0.03em]'>
          {t('privacy_policy_title')}
        </h1>

        <p className='mb-6 text-muted-foreground'>
          {t('privacy_policy_last_update', textValues)}
        </p>

        <p className='mb-6'>{t('privacy_policy_intro', textValues)}</p>

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

export default PrivacyPolicy;
