import { Outlet } from 'react-router';
import { cn } from 'cn';

import AppFooter from 'src/components/common/AppFooter';
import Navbar from 'src/components/common/Navbar';
import { MAIN_CONTENT_WIDTH_CLASS } from 'src/utils/constants';

// `isWorkspace` is for app-like pages that fill the screen (a project's chat and preview): the content
// area is exactly the screen under the navbar, as a column the page can stretch into (`flex-1`), with no
// width cap (the page goes wide once there's a preview) and only a little breathing room at the bottom.
// Regular pages get the footer, pushed to the bottom of the screen when the page is short; the workspace
// skips it since it already fills the screen.
export default function DefaultLayout({ isWorkspace = false }: { isWorkspace?: boolean }) {
  return (
    <div className='flex min-h-svh flex-col'>
      {/* layout = MAIN/FULL */}
      <Navbar layout='FULL' />
      {/* Spacer for the fixed navbar. */}
      <div className='h-16' />
      <main className={cn(isWorkspace ? 'flex h-[calc(100svh-4rem)] flex-col' : 'flex-1')}>
        <div className={cn('mx-auto p-4', isWorkspace ? 'flex min-h-0 w-full flex-1 flex-col pb-[50px]' : cn('mt-7 mb-12', MAIN_CONTENT_WIDTH_CLASS))}>
          <Outlet /> {/* This will render the nested route */}
        </div>
      </main>
      {!isWorkspace && <AppFooter />}
    </div>
  );
}
