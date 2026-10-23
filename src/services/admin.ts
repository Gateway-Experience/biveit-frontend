import { callBe } from 'src/utils/request';
import type { PlatformStatus, ProjectStatus, ServerUsage } from 'src/types/admin';

// Intentions: the admin dashboard's calls (biveit-backend controllers/admin). Admins only -- the BE answers
// 403 to anyone else, whatever the FE shows.
// The queries using these are keyed under ADMIN_QUERY_KEY, which main.tsx keeps out of the persisted cache:
// the platform's internals have no business sitting in localStorage.

const ADMIN_QUERY_KEY = 'admin';

async function getServerUsage(): Promise<ServerUsage> {
  return callBe('/admin/server-usage');
}

async function getPlatformStatus(): Promise<PlatformStatus> {
  return callBe('/admin/platform');
}

async function getProjectStatus(projectId: number): Promise<ProjectStatus> {
  return callBe(`/admin/projects/${projectId}`);
}

// Turns the project off: its agents' runners, its dev servers, its container. Nothing on disk is touched,
// so the owner opening it again brings it all back.
async function stopProject(projectId: number): Promise<unknown> {
  return callBe({ url: `/admin/projects/${projectId}/stop`, method: 'POST' });
}

export {
  ADMIN_QUERY_KEY,
  getServerUsage,
  getPlatformStatus,
  getProjectStatus,
  stopProject,
};
