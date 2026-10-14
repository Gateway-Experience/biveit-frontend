// Shape of a project as the BE returns it (vib3-backend dto/projects.py). snake_case to match the API,
// same as `User`.
export type Project = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  stage: 'specing' | 'implementing';
  // When the user signed off the built site (see DevenvStatus). null until then.
  implementation_done_at: string | null;
  // The bootstrap form's answers ({} for projects from before the form). See ProjectBootstrapData.
  bootstrap_data: Record<string, unknown>;
  meta: Record<string, unknown>;
  created_at: string;
  // "Last edited" — the list comes sorted by it, newest first.
  updated_at: string;
};

// The bootstrap form's answers. Stored by the BE as-is and handed to the agent as its starting brief (as
// JSON), so the keys are written for the agent to read.
export type ProjectBootstrapData = {
  // What the project is about, in the user's own words.
  description: string;
  // Landing page, blog, portfolio, web app... or anything the user typed in. Can be several, or none.
  site_kinds: string[];
};

// POST /projects body — sent when the bootstrap form is submitted, which is when a project comes into being.
export type CreateProjectBody = {
  name: string;
  bootstrap_data: ProjectBootstrapData;
};
