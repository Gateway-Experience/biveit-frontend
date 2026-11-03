import { Link, Outlet, useLocation } from 'react-router';
import { ChartColumnIcon, GaugeIcon, GlobeIcon, HouseIcon } from 'lucide-react';

import BrandLogo from 'src/components/common/BrandLogo';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from 'src/components/shadui/sidebar';
import { MAIN_CONTENT_WIDTH_CLASS, PATHS, SIDEBAR_WIDTH_PX } from 'src/utils/constants';

// Intentions: the frame of the admin pages (/admin/...) -- their own sidebar, listing the admin pages, in place of
// the app's (projects, folders...), which has nothing to do with operating the platform. Home goes back to the app.
// An operator's frame, so English only (no i18n), like the pages in it. On phones the sidebar is a drawer, opened
// from a slim top bar, as in DefaultLayout.

// The admin pages, in the sidebar's order. A page under one (a project's details under the dashboard) keeps that
// one highlighted: `isActive` says which paths belong to it.
const _ADMIN_PAGES = [
  {
    path: PATHS.admin,
    label: 'Dashboard',
    icon: GaugeIcon,
    isActive: (pathname: string) => pathname === PATHS.admin || pathname.startsWith(`${PATHS.admin}/projects/`),
  },
  { path: PATHS.adminAiUsage, label: 'AI usage', icon: ChartColumnIcon, isActive: (pathname: string) => pathname === PATHS.adminAiUsage },
  { path: PATHS.adminDomainTest, label: 'Domain test bench', icon: GlobeIcon, isActive: (pathname: string) => pathname === PATHS.adminDomainTest },
];

function AdminSidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  // On phones the sidebar is a drawer over the page: picking a page should close it.
  const closeIfMobile = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar variant='floating' data-component='admin-sidebar'>
      <SidebarHeader className='mx-2 flex-row items-center justify-between gap-2 border-b border-foreground/10 px-1 py-4'>
        <Link to={PATHS.admin} onClick={closeIfMobile} className='flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40'>
          <BrandLogo markClassName='h-8' />
        </Link>
        {!isMobile && <SidebarTrigger className='text-muted-foreground' />}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {_ADMIN_PAGES.map(({ path, label, icon: Icon, isActive }) => (
              <SidebarMenuItem key={path}>
                <SidebarMenuButton isActive={isActive(location.pathname)} render={<Link to={path} onClick={closeIfMobile} />}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to={PATHS.projects} onClick={closeIfMobile} />}>
              <HouseIcon />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider className='app-sidebar-wash' style={{ '--sidebar-width': `${SIDEBAR_WIDTH_PX}px` } as React.CSSProperties}>
      <AdminSidebar />
      <SidebarInset className='isolate min-h-svh'>
        <header className='flex h-14 shrink-0 items-center gap-2 border-b px-3 md:hidden'>
          <SidebarTrigger />
          <span className='text-sm font-medium'>Admin</span>
        </header>
        <main className='flex flex-1 flex-col'>
          <div className={`mx-auto mt-7 mb-12 w-full p-4 ${MAIN_CONTENT_WIDTH_CLASS}`}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
