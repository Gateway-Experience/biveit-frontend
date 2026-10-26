// The site preview's browsing history (see services/previewNavigation).
export type PreviewNavigation = {
  entries: string[];
  index: number;
  // Bumps on every load we ask for — including a reload of the same page — and keys the frame, which opens
  // whatever the current entry is when it mounts.
  loadCount: number;
};

export type PreviewDevice = 'desktop' | 'mobile';

// GET /conversations/{id}/devenv (biveit-backend). The user approving the plan moves a project from planning
// to building.
export type DevenvStatus = {
  stage: 'planning' | 'building';
  // When the user signed off the built site — from then on, payment/deployment is offered (whatever the
  // stage: it's set once and never cleared). null until then.
  build_approved_at: string | null;
  // A setup or a server restart is running right now.
  busy: boolean;
  // null while planning.
  preview_url: string | null;
  // [] while planning. `status` comes from pm2: only "online" means running.
  servers: { app: 'backend' | 'frontend'; status: string; port: number }[];
};

// The agent is in the middle of a big change (the first build, a new feature, a redesign), so the preview
// may be half-done. Read off the chat's BUILDING signals (see getActiveBuild); past `until` it's over even
// if nobody said so.
export type DevenvBuild = {
  since: string;
  until: string;
  // One line from the agent on what it's building.
  summary: string | null;
};

// What the preview area shows, decided from a DevenvStatus (see getPreviewState).
export type PreviewState = 'planning' | 'busy' | 'live' | 'down';
