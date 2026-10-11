import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import googleGPath from 'src/assets/google-g.svg';

type GoogleSignInButtonProps = {
  // Same-origin path the BE sends the browser back to after a successful sign-in. Anything that
  // isn't a plain `/path` gets swapped for `/` by the BE, so only pass app routes here.
  nextPath?: string;
  className?: string;
};

// Intentions: kick off the BE-driven Google OAuth flow. It has to be a full-page navigation (not
// fetch, not a popup) — the BE redirects to Google, Google redirects back to the BE callback, and
// the BE finally lands the browser on `nextPath` with the session cookie set (or on
// `/login?error=<CODE>` if something went wrong — see Login's error handling).
// A signed-in guest gets promoted in place automatically; the BE reads them from the cookie.
// References: fourpixie-backend/docs/google-login-fe-handoff.md §2
export default function GoogleSignInButton({ nextPath = '/', className }: GoogleSignInButtonProps) {
  const { t } = useTranslation();

  const startGoogleSignIn = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google/login?next=${encodeURIComponent(nextPath)}`;
  };

  return (
    <Button type='button' variant='outline' size='lg' className={cn('w-full', className)} onClick={startGoogleSignIn}>
      <img src={googleGPath} alt='' className='size-4.5' />
      {t('auth_continue_with_google')}
    </Button>
  );
}
