import { callBe } from 'src/utils/request';
import type { Project } from 'src/types/project';

// The current user's projects, most recently edited first. Empty means they haven't made one yet.
async function getProjects(): Promise<Project[]> {
  return callBe('/projects');
}

export {
  getProjects,
};
