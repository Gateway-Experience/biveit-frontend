import { Link, Outlet } from 'react-router';
import { cn } from 'cn';

import AppFooter from 'src/components/common/AppFooter';
import AppSidebar from 'src/components/common/AppSidebar';
import BrandLogo from 'src/components/common/BrandLogo';
import NewProjectModal from 'src/components/pages/projects/NewProjectModal';
import { SidebarInset, SidebarProvider, SidebarTrigger } from 'src/components/shadui/sidebar';
import { useStore } from 'src/state-store';
import { MAIN_CONTENT_WIDTH_CLASS, SIDEBAR_WIDTH_PX } from 'src/utils/constants';

// The app's frame: the sidebar on the left (AppSidebar), the page on the right. On phones the sidebar is a
// drawer, opened from a slim top bar that also carries the logo.
// `isWorkspace` is for app-like pages that fill the screen (a project's chat and preview): the page area is
// exactly the screen's height, as a column the page can stretch into (`flex-1`), with no width cap (the page
// goes wide once there's a preview). Regular pages get the usual centred column and the footer, pushed to
// the bottom of the screen when the page is short; the workspace skips the footer since it fills the screen.
// The new-project form lives here too, so it can open over any page (see `isNewProjectOpen` in the store).
export default function DefaultLayout({ isWorkspace = false }: { isWorkspace?: boolean }) {
  const isNewProjectOpen = useStore(state => state.isNewProjectOpen);
  const set = useStore(state => state.set);

  return (
    <SidebarProvider style={{ '--sidebar-width': `${SIDEBAR_WIDTH_PX}px` } as React.CSSProperties}>
      <AppSidebar />
      <NewProjectModal open={isNewProjectOpen} onClose={() => set({ isNewProjectOpen: false })} />
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
