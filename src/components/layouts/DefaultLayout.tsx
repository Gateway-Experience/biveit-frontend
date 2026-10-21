import { useState } from 'react';
import _ from 'lodash';
import { Link, Outlet } from 'react-router';
import { cn } from 'cn';

import AppFooter from 'src/components/common/AppFooter';
import AppSidebar from 'src/components/common/AppSidebar';
import BrandLogo from 'src/components/common/BrandLogo';
import { SidebarInset, SidebarProvider, SidebarTrigger } from 'src/components/shadui/sidebar';
import { MAIN_CONTENT_WIDTH_CLASS, SIDEBAR_WIDTH_PX, SIDEBAR_WIDTH_STORAGE_KEY } from 'src/utils/constants';

// The app's frame: the sidebar on the left (AppSidebar), the page on the right. On phones the sidebar is a
// drawer, opened from a slim top bar that also carries the logo.
// `isWorkspace` is for app-like pages that fill the screen (a project's chat and preview): the page area is
// exactly the screen's height, as a column the page can stretch into (`flex-1`), with no width cap (the page
// goes wide once there's a preview). Regular pages get the usual centred column and the footer, pushed to
// the bottom of the screen when the page is short; the workspace skips the footer since it fills the screen.
// [Pure-ish] The sidebar width the user last dragged to, or the default. localStorage can be missing or
// blocked (private windows), and a stored value can be junk, so anything odd means the default.
function _readSidebarWidth() {
  try {
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return stored ? _.clamp(stored, SIDEBAR_WIDTH_PX.min, SIDEBAR_WIDTH_PX.max) : SIDEBAR_WIDTH_PX.default;
  } catch {
    return SIDEBAR_WIDTH_PX.default;
  }
}

export default function DefaultLayout({ isWorkspace = false }: { isWorkspace?: boolean }) {
  const [sidebarWidth, setSidebarWidth] = useState(_readSidebarWidth);

  // Kept for next time; if the browser won't store it, it just lasts until the page is reloaded.
  const keepSidebarWidth = (width: number) => {
    setSidebarWidth(width);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
    } catch {
      // Nothing to do: see above.
    }
  };

  return (
    <SidebarProvider style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}>
      <AppSidebar onResized={keepSidebarWidth} />
      <SidebarInset className={cn(isWorkspace ? 'h-svh overflow-hidden' : 'min-h-svh')}>
        <header className='flex h-14 shrink-0 items-center gap-2 border-b px-3 md:hidden'>
          <SidebarTrigger />
          <Link to='/' className='flex rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
            <BrandLogo markClassName='h-7' />
          </Link>
        </header>
        <main className={cn('flex flex-1 flex-col', isWorkspace && 'min-h-0')}>
          <div className={cn('mx-auto p-4', isWorkspace ? 'flex min-h-0 w-full flex-1 flex-col md:p-6' : cn('mt-7 mb-12 w-full', MAIN_CONTENT_WIDTH_CLASS))}>
            <Outlet /> {/* This will render the nested route */}
          </div>
        </main>
        {!isWorkspace && <AppFooter />}
      </SidebarInset>
    </SidebarProvider>
  );
}
