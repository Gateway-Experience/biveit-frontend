import { Outlet } from 'react-router';
import { cn } from 'cn';

import { LandingFooter, LandingHeader } from 'src/components/pages/landing/LandingChrome';
import { MAIN_CONTENT_WIDTH_CLASS } from 'src/utils/constants';

// Original purpose: pricing and the policy pages for visitors who aren't signed in (the people who reach them
// from the landing page). They get the landing page's top bar and footer instead of the app's sidebar, which
// is only about their account and projects. Light theme only, like the landing page. Signed-in users see the
// same pages inside DefaultLayout (see routes).
export default function PublicLayout() {
  return (
    <div data-layout='public' className='force-light flex min-h-svh flex-col bg-background text-foreground'>
      <LandingHeader />
      <main className='flex flex-1 flex-col'>
        <div className={cn('mx-auto mt-7 mb-12 w-full p-4', MAIN_CONTENT_WIDTH_CLASS)}>
          <Outlet />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
