import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { APP_NAME, MAIN_CONTENT_WIDTH_CLASS, PATHS } from 'src/utils/constants';

const FOOTER_LINKS = [
  { labelKey: 'pricing_nav', path: PATHS.pricing },
  { labelKey: 'privacy_policy_title', path: PATHS.privacyPolicy },
  { labelKey: 'cookie_policy_title', path: PATHS.cookiePolicy },
];

// Intentions: a quiet footer for the app's regular pages, home of the policy links (kept out of the
// account menu so it stays about the user's own stuff).
export default function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className='border-t'>
      <div className={cn('mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row', MAIN_CONTENT_WIDTH_CLASS)}>
        <span>© {new Date().getFullYear()} {APP_NAME}</span>
        <nav className='flex gap-5'>
          {FOOTER_LINKS.map(link => (
            <Link key={link.labelKey} to={link.path} className='hover:text-foreground'>{t(link.labelKey)}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
