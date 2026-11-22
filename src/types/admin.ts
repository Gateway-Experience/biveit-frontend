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

// One user on the admin's users page (GET /admin/users). last_active_at: the newest of their last chat message, their
// last project edit and signing up (browsing alone doesn't move it). cost_usd: all their agents ever cost, at today's
// prices.
export type AdminUser = {
  id: number;
  email: string | null; // null for guests
  name: string | null;
  user_type: 'USER' | 'GUEST';
  is_admin: boolean;
  created_at: string;
  last_active_at: string;
  project_count: number; // live ones: archived count, Trash doesn't
  cost_usd: number;
};

export type PlatformStatus = {
  sections: StatusSection[];
  projects: AdminProject[];
};

// The dev environment as the owner's preview sees it (biveit-backend devenv.get_devenv_status). preview_url is null
// until the app's in the workspace (nothing built yet); a server's status is pm2's, or 'missing' (container off).
export type AdminDevenv = {
  busy: boolean; // a setup or a dev server command is running right now
  preview_url: string | null;
  servers: { app: 'backend' | 'frontend'; status: string; port: number }[];
};

export type ProjectStatus = {
  project: { id: number; name: string; stage: string; description: string | null };
  conversation_id: number; // its current conversation (what its owner's chat shows)
  is_running: boolean; // its container
  devenv: AdminDevenv;
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
  active_domain: string | null;
  urls: string[];
  last_deployment: Deployment | null;
};

// The calling admin's own sandbox mode (GET/PUT /admin/sandbox-mode): payments AND domains on their sandboxes.
// sandbox: their own choice (null = none, they follow the server); effective: whether their purchases are in sandbox
// mode now; server_sandbox: the server's default, for everyone without a choice of their own.
export type SandboxMode = {
  sandbox: boolean | null;
  effective: boolean;
  server_sandbox: boolean;
};

export type ProjectDeployments = {
  status: DeploymentStatus;
  history: Deployment[]; // newest first
  default_domain: string | null; // <project hash>.<PROD_DOMAIN>; null when the platform has no PROD_DOMAIN
};

// What the agents cost over a range (GET /admin/ai-usage), from the backend's ai_usage table at today's prices.
export type AiCostReport = {
  total_usd: number;
  users: { user_id: number; name: string; cost_usd: number; project_count: number }[]; // costliest first
  projects: { project_id: number; name: string | null; user_id: number; user_name: string; cost_usd: number }[];
};

// One project's cost per hour or per day (UTC) over a range (GET /admin/ai-usage/projects/:id); every bucket is
// there, empty ones at 0.
export type AiCostSeries = {
  bucket: 'hour' | 'day';
  points: { at: string; cost_usd: number }[];
};

// A project's plan as the admin page manages it (GET /admin/projects/<id>/plan): its latest plan or one-time
// subscription that isn't deleted, expired or not. provider 'admin' = set by hand here (editable); a Polar one was
// bought (delete only). created_at is when it starts; ends_at when it ends.
export type AdminPlanName = 'monthly' | 'yearly' | 'one_time';
export type ProjectPlan = {
  id: number;
  provider: 'admin' | 'polar' | 'polar_sandbox' | string;
  product: 'plan' | 'one_time';
  plan: AdminPlanName;
  status: string;
  created_at: string;
  ends_at: string | null;
  renews_at: string | null;
};
export type ProjectPlanRequest = { plan: AdminPlanName; starts_at: string; ends_at: string };
