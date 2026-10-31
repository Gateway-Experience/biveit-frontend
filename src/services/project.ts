import { callBe } from 'src/utils/request';
import type {
  CreateProjectBody, Project, ProjectChanges, ProjectFolder, ProjectPromptMatch,
} from 'src/types/project';

// The current user's projects, most recently edited first. Empty means they haven't made one yet.
async function getProjects(): Promise<Project[]> {
  return callBe('/projects');
}

// Resolves to the new project (its id is where the user goes next).
async function createProject(body: CreateProjectBody): Promise<Project> {
  return callBe({ method: 'POST', url: '/projects', data: body });
}

// Asks the BE to get the project ready (its workspace and agent session), so the agent doesn't cold-start
// on the first message. Idempotent — fine to call on every visit, from every tab. It's a warm-up, not a
// precondition: the BE ensures the session again on its own when a message is sent.
async function openProject(projectId: number): Promise<{ status: 'ready' }> {
  return callBe({ method: 'POST', url: `/projects/${projectId}/open` });
}

// Resolves to the project with its new name (and a fresh "edited" time).
async function renameProject(projectId: number, name: string): Promise<Project> {
  return updateProject(projectId, { name });
}

// Rename, pin/unpin, or file into a folder — send only what changes. Resolves to the updated project.
async function updateProject(projectId: number, changes: ProjectChanges): Promise<Project> {
  return callBe({ method: 'PATCH', url: `/projects/${projectId}`, data: changes });
}

// Projects where the user wrote `query` while prompting (their starting description or a chat message),
// each with the bit of text that matched. Name matches aren't in here: filter the list you have for those.
async function searchProjectPrompts(query: string): Promise<ProjectPromptMatch[]> {
  return callBe({ url: '/projects/search', params: { q: query } });
}

// The user's sidebar folders, in the order they made them.
async function getProjectFolders(): Promise<ProjectFolder[]> {
  return callBe('/project-folders');
}

async function createProjectFolder(name: string): Promise<ProjectFolder> {
  return callBe({ method: 'POST', url: '/project-folders', data: { name } });
}

async function renameProjectFolder(folderId: number, name: string): Promise<ProjectFolder> {
  return callBe({ method: 'PATCH', url: `/project-folders/${folderId}`, data: { name } });
}

// Its projects stay; they just aren't in a folder any more.
async function deleteProjectFolder(folderId: number): Promise<void> {
  return callBe({ method: 'DELETE', url: `/project-folders/${folderId}` });
}

// The picture of the project's dev site, for its card (only when it has one: see site_preview_at). The time
// it was taken is in the URL, so each picture has its own URL and the browser can cache it for good.
function getSitePreviewUrl(project: Project): string {
  const takenAt = encodeURIComponent(project.site_preview_at || '');
  return `${import.meta.env.VITE_API_BASE_URL}/projects/${project.id}/site-preview?v=${takenAt}`;
}

// The steps a project goes through, in order (i18n keys). The first is the new-project form, so every project is
// past it.
const PROJECT_STEP_KEYS = ['project_step_describe', 'project_step_plan', 'project_step_build', 'project_step_launch'];

// [Pure] Which step the project is at (index into PROJECT_STEP_KEYS), read off its stage and sign-off: nothing
// extra is stored for it. Signed off = publishing is on offer, whatever the stage.
function getProjectStepIndex(stage: Project['stage'], buildApprovedAt: string | null | undefined): number {
  if (buildApprovedAt) {
    return 3;
  }
  return stage === 'building' ? 2 : 1;
}

// Whether the user has ever made a project, counting ones since trashed or deleted for good.
async function getProjectHistory(): Promise<{ has_created_project: boolean }> {
  return callBe('/projects/history');
}

// The user's projects in Trash, most recently trashed first.
async function getTrashedProjects(): Promise<Project[]> {
  return callBe('/projects/trash');
}

// Out of the project list and into Trash (the BE turns off whatever was running for it). Resolves to the
// trashed project.
async function trashProject(projectId: number): Promise<Project> {
  return callBe({ method: 'POST', url: `/projects/${projectId}/trash` });
}

// Out of Trash, back in the list where it was. Resolves to the restored project.
async function restoreProject(projectId: number): Promise<Project> {
  return callBe({ method: 'POST', url: `/projects/${projectId}/restore` });
}

// Gone for good. Only works on a project in Trash.
async function deleteProject(projectId: number): Promise<void> {
  return callBe({ method: 'DELETE', url: `/projects/${projectId}` });
}

export {
  PROJECT_STEP_KEYS,
  createProject,
  createProjectFolder,
  deleteProject,
  deleteProjectFolder,
  getProjectFolders,
  getProjectHistory,
  getProjectStepIndex,
  getProjects,
  getSitePreviewUrl,
  getTrashedProjects,
  openProject,
  renameProject,
  renameProjectFolder,
  restoreProject,
  searchProjectPrompts,
  trashProject,
  updateProject,
};
