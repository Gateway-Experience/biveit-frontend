import { callBe } from 'src/utils/request';
import type { CreateProjectBody, Project } from 'src/types/project';

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

export {
  createProject,
  getProjects,
  openProject,
};
