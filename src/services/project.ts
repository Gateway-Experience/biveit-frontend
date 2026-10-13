import mockProjects from 'src/data/mockProjects';
import { sleep } from 'src/utils/common';
import type { Project } from 'src/types/project';

// Lists the current user's projects, most recently edited first.
// TODO: replace the mock with `callBe('/projects')` once the endpoint exists.
async function getProjects(): Promise<Project[]> {
  // Fake latency so the loading state is exercised during development.
  await sleep(400);
  return mockProjects;
}

export {
  getProjects,
};
