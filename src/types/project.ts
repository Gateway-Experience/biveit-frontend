// Shape of a project as the BE returns it (vib3-backend dto/projects.py). snake_case to match the API,
// same as `User`.
export type Project = {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  // "Last edited" — the list comes sorted by it, newest first.
  updated_at: string;
};
