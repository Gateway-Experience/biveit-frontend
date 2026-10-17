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

// Gone from the user's list for good (the BE turns off whatever was running for it).
async function deleteProject(projectId: number): Promise<void> {
  return callBe({ method: 'DELETE', url: `/projects/${projectId}` });
}

export {
  createProject,
  createProjectFolder,
  deleteProject,
  deleteProjectFolder,
  getProjectFolders,
  getProjects,
  openProject,
  renameProject,
  renameProjectFolder,
  searchProjectPrompts,
  updateProject,
};
