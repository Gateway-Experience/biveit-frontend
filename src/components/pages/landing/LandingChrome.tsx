import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import BrandLogo from 'src/components/common/BrandLogo';
import LanguageSelector from 'src/components/common/LanguageSelector';
import LinkButton from 'src/components/common/LinkButton';
import { APP_NAME, PATHS } from 'src/utils/constants';

// The landing page's top bar and footer, plus the few styles that go with them. Shared with PublicLayout, so
// the pages a visitor can open from the landing page (pricing, policies) keep the same frame.

// The landing page runs wider than the app's content column (MAIN_CONTENT_WIDTH_CLASS).
const LANDING_WIDTH_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

// Every "start" button goes to the projects page. Visitors who aren't signed in get bounced through login
// (or sign-up) by ProtectedRoute and land there afterwards: on their list, not straight in the new-project
// form, so returning users see their work first and new ones get the empty state's "create" button.
const START_PATH = PATHS.projects;

// The primary (lavender) button. Hover darkens through a filter instead of fading the fill (bg-primary/85), so
// the dot grid never shows through.
const BRAND_BUTTON_CLASS = 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:brightness-95';

function LandingHeader() {
  const { t } = useTranslation();

  return (
    <header className='sticky top-0 z-40 border-b border-foreground/10 bg-brand-light'>
      <div className={cn(LANDING_WIDTH_CLASS, 'flex h-16 items-center justify-between gap-3')}>
        <Link to='/' className='flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <BrandLogo />
        </Link>
        <div className='flex items-center gap-1 sm:gap-2'>
          <LanguageSelector />
          <LinkButton href={START_PATH} size='sm' className={BRAND_BUTTON_CLASS}>{t('landing_nav_start')}</LinkButton>
        </div>
      </div>
    </header>
  );
}

function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className='border-t bg-card text-muted-foreground'>
      <div className={cn(LANDING_WIDTH_CLASS, 'flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row')}>
        <div className='flex items-center gap-2'>
          <BrandLogo hasWordmark={false} markClassName='h-6' />
          {t('landing_footer_rights', { year: new Date().getFullYear(), appName: APP_NAME })}
        </div>
        <div className='flex items-center gap-4'>
          <Link to={PATHS.pricing} className='hover:text-foreground'>{t('pricing_nav')}</Link>
          <Link to={PATHS.privacyPolicy} className='hover:text-foreground'>{t('landing_footer_privacy')}</Link>
          <Link to={PATHS.cookiePolicy} className='hover:text-foreground'>{t('cookie_policy_title')}</Link>
        </div>
      </div>
    </footer>
  );
}

export {
  LANDING_WIDTH_CLASS,
  START_PATH,
  BRAND_BUTTON_CLASS,
  LandingHeader,
  LandingFooter,
};
