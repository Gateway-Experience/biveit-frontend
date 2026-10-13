// Shape of a project as the backend will return it (`/projects`). snake_case to match the API,
// same as `User`.
export type ProjectStatus = 'DRAFT' | 'PUBLISHED';

export type Project = {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  // Screenshot of the generated site. Missing until the first build finishes.
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
};
