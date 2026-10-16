import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import BrandLogo from 'src/components/common/BrandLogo';
import GoogleSignInButton from 'src/components/common/GoogleSignInButton';
import LanguageSelector from 'src/components/common/LanguageSelector';
import { Card, CardContent } from 'src/components/shadui/card';
import { PATHS } from 'src/utils/constants';

type AuthPageLayoutProps = {
  pageName: string;
  title: string;
  // Optional small uppercase line above the title, and a muted line below it.
  eyebrow?: string;
  subtitle?: string;
  // Where the BE lands the browser after a successful Google sign-in.
  googleNextPath: string;
  // The "Don't have an account? Create one" line that links to the sibling auth page.
  switchPrompt: string;
  switchLinkLabel: string;
  switchLinkTo: string;
  // The email/password form.
  children: React.ReactNode;
};

// Intentions: the shared page for /login and /register — a slim top bar (brand on the left, language
// switcher on the right) over a centered card: title, Google, "or use your email", the page's own form,
// then the link to the other auth page and the policies line.
export default function AuthPageLayout({
  pageName, title, eyebrow, subtitle, googleNextPath, switchPrompt, switchLinkLabel, switchLinkTo, children,
}: AuthPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <div data-page={pageName} className='flex min-h-svh flex-col'>
      <header className='flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6'>
        <BrandLogo className='cursor-default select-none' />
        <LanguageSelector />
      </header>

      <main className='flex flex-1 items-center justify-center px-4 py-14'>
        <Card className='w-full max-w-[512px]'>
          <CardContent>
            {eyebrow && (
              <span className='mb-3 block text-[0.625rem] font-bold tracking-[0.18em] text-muted-foreground uppercase'>{eyebrow}</span>
            )}
            <h1 className='font-heading text-[1.625rem] font-bold tracking-[-0.03em]'>{title}</h1>
            {subtitle && <p className='mt-2 text-muted-foreground'>{subtitle}</p>}

            <GoogleSignInButton nextPath={googleNextPath} className='mt-6' />

            <div className='my-3.5 flex items-center gap-3 text-[0.6875rem] text-muted-foreground'>
              <span className='h-px flex-1 bg-border' />
              {t('auth_or_use_email')}
              <span className='h-px flex-1 bg-border' />
            </div>

            {children}

            <p className='mt-5 text-center text-sm text-muted-foreground'>
              {switchPrompt}
              {' '}<Link to={switchLinkTo} className='font-semibold text-foreground underline-offset-3 hover:underline'>{switchLinkLabel}</Link>
            </p>

            <p className='mt-3 text-center text-[0.6875rem] leading-[1.65] text-muted-foreground'>
              {t('auth_agree_policies_prefix')}
              {' '}<Link to={PATHS.privacyPolicy} className='underline underline-offset-3 hover:text-foreground'>{t('auth_policies')}</Link>.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
