// Shapes of the launch flow's API (biveit-backend controllers/launch, services/launch). snake_case to match the API.

export type PlanKey = 'monthly' | 'yearly' | 'one_time';

// Opens the launch dialog: 'new' to buy a plan (`plan`: already picked, so the dialog starts past its plan step),
// 'domain' to finish / choose a domain on a running plan.
export type OpenLaunchDialog = (mode: 'new' | 'domain', options?: { plan?: PlanKey }) => void;

export type LaunchPlan = {
  key: PlanKey;
  product: 'plan' | 'one_time';
  price_usd: number;
  interval: 'month' | 'year' | null;
  hosting: boolean;
  edit_days?: number;
};

// One of the backend's stages (services/launch/status.to_stage) -- what the Launch tab and dialog switch on. The
// domain words (attached, servable, active) are the backend's docs/launchflow.txt "Domains".
export type LaunchStage =
  | 'not_paid' | 'code_only' | 'ended' | 'choose_domain' | 'registering_domain'
  | 'waiting_dns' | 'deploying' | 'failed' | 'not_servable' | 'live';

// action 'add': a record the domain needs (found = it's there). 'remove': one it must lose -- an AAAA pointing
// elsewhere would make the certificate fail; listed only while it's there.
export type DnsRecord = { type: 'A' | 'TXT' | 'AAAA'; name: string; value: string; action: 'add' | 'remove'; found: boolean };

export type OwnDomainCheck = {
  domain: string;
  blocked: null | 'invalid' | 'ours' | 'taken';
  records: DnsRecord[];
  verified: boolean;
};

export type DomainOffer = {
  domain: string;
  available: boolean;
  sold: boolean;
  price_per_year: number | null;
  discountable: boolean;
};

export type LaunchDeployment = {
  live: { commit: string; deployed_at: string; running: boolean } | null;
  deploying: boolean;
  urls: string[];
  cooldown_until: string | null;
  last_deployment: { id: string; started_at: string; outcome: string; error: string | null } | null;
};

export type LaunchStatus = {
  stage: LaunchStage;
  plans: LaunchPlan[];
  access: { can_download: boolean; can_edit: boolean; can_host: boolean; has_had_plan: boolean; edit_until: string | null };
  plan: { plan: 'monthly' | 'yearly'; status: string; renews_at: string | null; ends_at: string | null } | null;
  one_time: { paid_at: string } | null;
  domain_subscription: { domain: string; status: string; renews_at: string | null; trial_ends_at: string | null } | null;
  // The active domain: set up and served. It stays active even if it stops being servable (stage not_servable).
  domain: { domain: string; kind: 'purchased' | 'external' | 'admin'; servable: boolean; check: OwnDomainCheck | null } | null;
  // Every attached domain. servable: it could be switched to now (a user's own once its records check out).
  site_domains: { domain: string; kind: 'purchased' | 'external' | 'admin'; active: boolean; servable: boolean }[];
  // The domain being set up right now (the old one keeps serving until it's done), and the last that failed to be.
  setting_up: string | null;
  // cause: dns (a user's own domain without its records), certificate, release (the site itself didn't come up).
  setup_failure: { domain: string; cause: 'dns' | 'certificate' | 'release'; error: string; at: string } | null;
  // Whether a domain bought now gets the domain discount (with a yearly plan, once per project; today, the first year
  // free).
  has_domain_discount: boolean;
  // The last bought domain that couldn't be registered, until another one replaces it.
  registration_failure: { domain: string; reason: string; at: string } | null;
  deployment: LaunchDeployment;
  server_ip: string;
};

// Who a bought domain is registered to (the user -- its legal owner).
export type Registrant = {
  first_name: string;
  last_name: string;
  company_name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  email: string;
  phone: string;
};

// What the domain step chose. A user's own domain carries its DNS records as last checked (shown again at review).
export type DomainChoice = { kind: 'buy'; name: string; price_per_year: number; discountable: boolean }
  | { kind: 'own'; name: string; records: DnsRecord[] };

// One thing to pay for: the provider has no cart, so a plan and a domain are two checkouts, the plan first.
// How a domain switch went (a long-running operation, polled by its id). Only to tell the user: nothing decides from it.
export type DomainSwitch = {
  operation_id: string;
  domain: string;
  state: 'running' | 'succeeded' | 'failed' | 'interrupted';
  cause: 'dns' | 'certificate' | 'release' | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type LaunchCheckout = { product: 'plan' | 'domain'; url: string };

export type MockCheckout = {
  id: string;
  email: string;
  item: { product: 'plan' | 'domain' | 'one_time'; plan?: PlanKey; price_per_year?: number; discounted?: boolean } | null;
  price_usd: number | null;
  project_id: number;
  domain: string | null;
};
