import { Fragment } from 'react';
import { Link, Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpIcon, LockIcon } from 'lucide-react';
import { cn } from 'cn';
import _ from 'lodash';

import BrandLogo, { BrandWordmark } from 'src/components/common/BrandLogo';
import GoogleSignInButton from 'src/components/common/GoogleSignInButton';
import LanguageSelector from 'src/components/common/LanguageSelector';
import { useStore } from 'src/state-store';
import { isSignedInUser } from 'src/services/user';
import { APP_NAME, EXAMPLE_IDEA_KEYS, PATHS } from 'src/utils/constants';
import { useTypewriter } from 'src/utils/hooks';

type AuthPageLayoutProps = {
  pageName: string;
  title: string;
  // Optional small uppercase line above the title, and a muted line below it.
  eyebrow?: string;
  subtitle?: string;
  // Where to go once signed in: where the BE lands the browser after Google sign-in, and where someone
  // who's already signed in gets bounced to if they reach this page (e.g. with the Back button).
  nextPath: string;
  // The "Continue with Google" button and the "or" under it. Off for pages that aren't a way to sign in
  // (forgot / reset password).
  hasGoogleSignIn?: boolean;
  // The "Don't have an account? Create one" line that links to the sibling auth page.
  switchPrompt: string;
  switchLinkLabel: string;
  switchLinkTo: string;
  // The email/password form.
  children: React.ReactNode;
};

// Intentions: the shared page for /login and /register, split in two. On the left, the form column: brand in
// the top-left corner (linking back to the landing page), then title, Google, "or", the page's own form, then the link to the other
// auth page and the policies line. On the right (wide screens only), a showcase panel that reminds people
// what they're signing in for: a prompt box asking biveit to build something.
export default function AuthPageLayout({
  pageName, title, eyebrow, subtitle, nextPath, hasGoogleSignIn = true, switchPrompt, switchLinkLabel, switchLinkTo, children,
}: AuthPageLayoutProps) {
  const { t } = useTranslation();
  const user = useStore(state => state.user);

  // A signed-in user has no business on /login or /register. Without this, pressing Back after signing
  // in shows the form again as if they were logged out. `replace` so Back doesn't keep landing here.
  if (isSignedInUser(user)) {
    return <Navigate to={nextPath} replace />;
  }

  return (
    <div data-page={pageName} className='flex min-h-svh bg-background'>
      <div className='flex flex-1 flex-col px-6 lg:w-1/2 lg:flex-none'>
        {/* Top bar: the brand in the top-left corner, the language switcher in the top-right, on one line. */}
        <header className='flex items-center justify-between pt-4'>
          {/* Back to the landing site ("/" sends anyone not signed in there, i.e. everyone on these pages). */}
          <Link to='/' className='inline-flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
            <BrandLogo markClassName='h-9' />
          </Link>
          <LanguageSelector />
        </header>

        <main className='flex flex-1 items-center justify-center py-12'>
          <div className='w-full max-w-[360px]'>
            {eyebrow && (
              <span className='block text-[0.625rem] font-bold tracking-[0.18em] text-muted-foreground uppercase'>{eyebrow}</span>
            )}
            <h1 className={cn('font-heading text-[1.75rem] font-bold tracking-[-0.03em]', eyebrow && 'mt-2')}>{_renderWithWordmark(title)}</h1>
            {subtitle && <p className='mt-2 text-muted-foreground'>{subtitle}</p>}

            {hasGoogleSignIn
              ? (
                <>
                  <GoogleSignInButton nextPath={nextPath} className='mt-8 h-11 rounded-full' />
                  <div className='my-5 flex items-center gap-3 text-[0.6875rem] font-medium text-muted-foreground uppercase'>
                    <span className='h-px flex-1 bg-linear-to-r from-transparent to-border' />
                    {t('auth_or')}
                    <span className='h-px flex-1 bg-linear-to-l from-transparent to-border' />
                  </div>
                </>
              )
              : <div className='mt-8' />}

            {children}

            {/* `replace`: hopping between log in and sign up shouldn't pile up history entries for Back to walk through. */}
            <p className='mt-5 text-center text-sm text-muted-foreground'>
              {switchPrompt}
              {' '}<Link to={switchLinkTo} replace className='font-semibold text-foreground underline underline-offset-3'>{switchLinkLabel}</Link>
            </p>

            <p className='mt-5 flex items-center justify-center gap-1.5 border-t pt-5 text-center text-xs text-muted-foreground'>
              <LockIcon className='size-3.5 shrink-0' />
              <span>
                {t('auth_agree_policies_prefix')}
                {' '}<Link to={PATHS.termsOfService} className='font-medium text-foreground hover:underline'>{t('terms_title')}</Link>
                {' '}{t('auth_and')}
                {' '}<Link to={PATHS.privacyPolicy} className='font-medium text-foreground hover:underline'>{t('privacy_policy_title')}</Link>
              </span>
            </p>
          </div>
        </main>
      </div>

      <AuthShowcasePanel />
    </div>
  );
}

// [Pure] `text` with the name ("Log in to biveit") drawn as the wordmark, wherever the language puts it.
function _renderWithWordmark(text: string) {
  const textParts = _.split(text, APP_NAME);
  return textParts.map((textPart, index) => (
    <Fragment key={index}>
      {textPart}
      {index < textParts.length - 1 && <BrandWordmark />}
    </Fragment>
  ));
}

// The right-hand panel: a dark-to-brand gradient (built from theme tokens, so no image to load) with a
// prompt box in the middle where business ideas type themselves out one after another, as if someone
// were asking biveit for a site right now.
function AuthShowcasePanel() {
  const { t } = useTranslation();
  const typed = useTypewriter(EXAMPLE_IDEA_KEYS.map(promptKey => t(promptKey)));

  return (
    <aside aria-hidden='true' className='hidden p-3 lg:block lg:w-1/2'>
      <div
        className='relative grid size-full place-items-center overflow-hidden rounded-3xl bg-brand-ink'
        style={{
          backgroundImage: [
            'radial-gradient(85% 50% at 50% 105%, var(--brand-light) 0%, transparent 70%)',
            'radial-gradient(130% 85% at 50% 100%, var(--brand-deep) 0%, transparent 72%)',
            'radial-gradient(170% 115% at 50% 100%, var(--brand-deep) 0%, transparent 78%)',
          ].join(', '),
        }}
      >
        <div className='flex w-[min(460px,80%)] items-center gap-3 rounded-2xl bg-card/90 py-3.5 pr-3.5 pl-5 text-card-foreground shadow-2xl shadow-brand-ink/40 backdrop-blur'>
          <p data-phraseindex={typed.phraseIndex} className='min-h-6 flex-1'>
            {typed.text}
            {/* Solid while typing, blinking while it waits, like a real text cursor. */}
            <span className={cn('ml-0.5 inline-block h-4.5 w-0.5 translate-y-0.5 bg-primary', typed.isIdle && 'animate-caret-blink')} />
          </p>
          <span className='grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-background'>
            <ArrowUpIcon className='size-4.5' />
          </span>
        </div>
      </div>
    </aside>
  );
}
