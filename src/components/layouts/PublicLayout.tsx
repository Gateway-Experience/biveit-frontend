import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import BrandLogo from 'src/components/common/BrandLogo';
import LanguageSelector from 'src/components/common/LanguageSelector';
import LinkButton from 'src/components/common/LinkButton';
import { APP_NAME, MAIN_CONTENT_WIDTH_CLASS, PATHS } from 'src/utils/constants';

// The header and footer run wider than the app's content column (MAIN_CONTENT_WIDTH_CLASS), like the landing site's.
const _WIDE_WIDTH_CLASS = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

// Every "start" button goes to the projects page. Visitors who aren't signed in get bounced through login
// (or sign-up) by ProtectedRoute and land there afterwards: on their list, not straight in the new-project
// form, so returning users see their work first and new ones get the empty state's "create" button.
const _START_PATH = PATHS.projects;

// The primary (lavender) button. Hover darkens through a filter instead of fading the fill (bg-primary/85), so
// the dot grid never shows through.
const _BRAND_BUTTON_CLASS = 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:brightness-95';

function PublicHeader() {
  const { t } = useTranslation();

  return (
    <header className='sticky top-0 z-40 border-b border-foreground/10 bg-brand-light'>
      <div className={cn(_WIDE_WIDTH_CLASS, 'flex h-16 items-center justify-between gap-3')}>
        <Link to='/' className='flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <BrandLogo />
        </Link>
        <div className='flex items-center gap-1 sm:gap-2'>
          <LanguageSelector />
          <LinkButton href={_START_PATH} size='sm' className={_BRAND_BUTTON_CLASS}>{t('landing_nav_start')}</LinkButton>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className='border-t bg-card text-muted-foreground'>
      <div className={cn(_WIDE_WIDTH_CLASS, 'flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row')}>
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

// Original purpose: pricing and the policy pages for visitors who aren't signed in (the people who reach them
// from the landing site). They get a top bar and footer like the landing site's (vib3-landing's Header and
// Footer) instead of the app's sidebar, which is only about their account and projects. Light theme only, like
// the landing site. Signed-in users see the same pages inside DefaultLayout (see routes).
export default function PublicLayout() {
  return (
    <div data-layout='public' className='force-light flex min-h-svh flex-col bg-background text-foreground'>
      <PublicHeader />
      <main className='flex flex-1 flex-col'>
        <div className={cn('mx-auto mt-7 mb-12 w-full p-4', MAIN_CONTENT_WIDTH_CLASS)}>
          <Outlet />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
