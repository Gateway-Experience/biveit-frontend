// The site preview's browsing history (see services/previewNavigation).
export type PreviewNavigation = {
  entries: string[];
  index: number;
  // Bumps on every load we ask for — including a reload of the same page — and keys the frame, which opens
  // whatever the current entry is when it mounts.
  loadCount: number;
};

export type PreviewDevice = 'desktop' | 'mobile';

// GET /conversations/{id}/devenv (vib3-backend). The agent decides when a project moves from specing to
// implementing.
export type DevenvStatus = {
  stage: 'specing' | 'implementing';
  // When the user signed off the built site — from then on, payment/deployment is offered (whatever the
  // stage: it's set once and never cleared). null until then.
  implementation_done_at: string | null;
  // A setup or a server restart is running right now.
  busy: boolean;
  // null while specing.
  preview_url: string | null;
  // [] while specing. `status` comes from pm2: only "online" means running.
  servers: { app: 'backend' | 'frontend'; status: string; port: number }[];
  // Set while the agent is in the middle of a big change (the first build, a new feature, a redesign), so
  // the preview may be half-done. It switches itself off at `until` unless the agent refreshes it, and that
  // expiry sends no event — so past `until` it counts as off (see getActiveBuild).
  building: DevenvBuild | null;
};

export type DevenvBuild = {
  since: string;
  until: string;
  // One line from the agent on what it's building.
  summary: string | null;
};

// What the preview area shows, decided from a DevenvStatus (see getPreviewState).
export type PreviewState = 'specing' | 'busy' | 'live' | 'down';
