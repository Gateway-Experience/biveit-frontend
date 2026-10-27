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

// A project's production site (biveit-backend modules/deployments), as GET /admin/projects/<id>/deployments
// hands it back.
export type DeploymentOutcome = 'running' | 'succeeded' | 'rolled_back' | 'failed' | 'interrupted';

export type Deployment = {
  id: string;
  commit: string;
  started_at: string;
  finished_at: string | null;
  outcome: DeploymentOutcome;
  live_commit: string | null; // what it left running: its own commit, or the one it rolled back to
  attempts: { attempt: number; error: string; at: string }[]; // the failed ones
  error: string | null;
};

export type DeploymentStatus = {
  live: { commit: string; deployed_at: string; running: boolean } | null; // null = never deployed
  deploying: boolean;
  has_undeployed_changes: boolean | null; // null = can't tell (the dev container is stopped)
  can_deploy: boolean;
  domains: string[];
  urls: string[];
  last_deployment: Deployment | null;
};

export type ProjectDeployments = {
  status: DeploymentStatus;
  history: Deployment[]; // newest first
  default_domain: string | null; // <project hash>.<PROD_DOMAIN>; null when the platform has no PROD_DOMAIN
};
