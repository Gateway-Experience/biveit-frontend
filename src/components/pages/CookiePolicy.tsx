import { useTranslation } from 'react-i18next';

import { Button } from 'src/components/shadui/button';
import { useStore } from 'src/state-store';

// Bump this whenever the policy text changes. A fixed date (not "today") so the page doesn't claim a
// fresh update on every visit. Month is 0-based.
const LAST_UPDATED = new Date(2026, 9, 17);

// Keep these in step with what the app actually stores: the BE's access_token + oauth_session cookies
// (biveit-backend: utils/auth.set_access_cookie, app.py SessionMiddleware), and the FE's localStorage use
// (language in AppProvider, the query cache in main.tsx, mixpanel in services/analytics).
const SECTIONS = [
  { titleKey: 'cookie_policy_essential_title', bodyKey: 'cookie_policy_essential_body' },
  { titleKey: 'cookie_policy_storage_title', bodyKey: 'cookie_policy_storage_body' },
  { titleKey: 'cookie_policy_analytics_title', bodyKey: 'cookie_policy_analytics_body' },
  { titleKey: 'cookie_policy_control_title', bodyKey: 'cookie_policy_control_body' },
];

const CookiePolicy = () => {
  const { t, i18n } = useTranslation();
  const set = useStore(state => state.set);

  return (
    <div className='mx-auto max-w-3xl'>
      <div className='py-4'>
        <h1 className='mb-4 font-heading text-3xl font-bold tracking-[-0.03em]'>
          {t('cookie_policy_title')}
        </h1>

        <p className='mb-6 text-muted-foreground'>
          {/* No escaping: React already escapes text, and i18next's would show a date's slashes as &#x2F;. */}
          {t('privacy_policy_last_update', { date: LAST_UPDATED.toLocaleDateString(i18n.resolvedLanguage), interpolation: { escapeValue: false } })}
        </p>

        <p className='mb-6'>{t('cookie_policy_intro')}</p>

        {SECTIONS.map(section => (
          <section key={section.titleKey} className='mb-6'>
            <h2 className='mb-2 font-heading text-xl font-bold'>{t(section.titleKey)}</h2>
            <p className='whitespace-pre-line'>{t(section.bodyKey)}</p>
          </section>
        ))}

        <Button variant='outline' onClick={() => set({ isCookiePreferencesOpen: true })}>
          {t('cookie_banner_manage')}
        </Button>
      </div>
    </div>
  );
};

export default CookiePolicy;
