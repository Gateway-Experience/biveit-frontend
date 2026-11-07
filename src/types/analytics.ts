import type { MessageSendVia } from 'src/types/chat';
import type { LaunchSource, PlanKey } from 'src/types/launch';

// Intentions: the one catalog of the events the app sends, name -> properties. trackEvent is typed against it, so a
// typo or a renamed property fails typecheck instead of quietly splitting a funnel in PostHog. Add new events here.
// Never put user content in properties (message text, project descriptions, question text, domain names).
// References: services/analytics (trackEvent). The backend sends its own events (user_signed_up, agent_first_replied,
// plan_approved, build_approved, payment_succeeded, site_went_live, launch_failed) -- they're not listed here.

type DomainKind = 'buy' | 'own' | 'subdomain';

export type AnalyticsEventMap = {
  auth_failed: { method: 'email' | 'google'; form: 'login' | 'register'; code: string };
  new_project_form_opened: { source: 'empty_state' | 'project_grid' | 'sidebar' | 'landing_idea' };
  project_created: { project_id: number; site_kinds: string[]; has_other_site_kind: boolean; from_landing_idea: boolean };
  // One per failed attempt, retries included (is_retry = the user pressed retry).
  project_setup_failed: { project_id: number; is_retry: boolean };
  // via: how the text got into the box -- typed, the suggested reply, or handed over from elsewhere (e.g. the launch dialog).
  message_sent: { project_id: number; via: MessageSendVia; attachment_count: number };
  // One per question or action in a submission. status is the backend's own: aborted = the one they skipped at,
  // untouched = the ones after it.
  interaction_answered: {
    project_id: number;
    tool: 'ask_user' | 'request_actions';
    status: 'submitted' | 'aborted' | 'untouched';
    action?: string;
    decision?: 'approved' | 'iterate';
  };
  chat_error_shown: { project_id: number; code: string; scope?: 'ip' | 'user' };
  launch_dialog_opened: { project_id: number; mode: 'new' | 'domain'; source: LaunchSource };
  // is_preselected: the plan was picked before the dialog opened (it then skips its plan step).
  launch_option_selected: { project_id: number; step: 'plan' | 'domain'; plan?: PlanKey; domain_kind?: DomainKind; is_preselected: boolean };
  checkout_started: { project_id: number; product: 'plan' | 'domain'; plan?: PlanKey; domain_kind?: DomainKind };
  launch_error_shown: { project_id: number; code: string };
  showcase_demo_clicked: { source: string; at: string };
};
