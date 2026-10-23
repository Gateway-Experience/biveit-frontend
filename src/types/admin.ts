// Shapes of the admin dashboard's API (biveit-backend controllers/admin). snake_case to match the API.

// One block of the platform's status: label/value rows, every value already a string to show. The same
// sections the backend's `scripts.manage status` prints (services/platform_status).
export type StatusSection = {
  title: string;
  rows: { label: string; value: string }[];
};

// The machine's CPU, memory and disk. Sizes in bytes; CPU % is since the previous read (the first one is 0).
export type ServerUsage = {
  cpu: { percent: number; count: number; load: [number, number, number] };
  memory: { used: number; total: number; percent: number };
  disk: { used: number; total: number; percent: number };
  uptime_seconds: number;
};

export type AdminProject = {
  id: number;
  name: string;
  stage: string;
  owner: { id: number; username: string | null }; // no username: a guest
  is_running: boolean; // its container
  updated_at: string;
};

export type PlatformStatus = {
  sections: StatusSection[];
  projects: AdminProject[];
};

export type ProjectStatus = {
  project: { id: number; name: string; stage: string };
  sections: StatusSection[];
};
