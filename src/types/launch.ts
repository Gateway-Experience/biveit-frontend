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

// One of the backend's stages (services/launch/status.to_stage) -- what the Launch tab and dialog switch on.
export type LaunchStage =
  | 'not_paid' | 'code_only' | 'ended' | 'finish_domain' | 'choose_domain' | 'registering_domain'
  | 'waiting_dns' | 'deploying' | 'failed' | 'live';

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
  free_first_year_eligible: boolean;
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
  access: { can_download: boolean; can_edit: boolean; can_host: boolean; edit_until: string | null };
  plan: { plan: 'monthly' | 'yearly'; status: string; renews_at: string | null; ends_at: string | null } | null;
  one_time: { paid_at: string } | null;
  domain_subscription: { domain: string; status: string; renews_at: string | null; trial_ends_at: string | null } | null;
  domain: { domain: string; kind: 'purchased' | 'external' | 'admin'; servable: boolean; check: OwnDomainCheck | null } | null;
  site_domains: { domain: string; kind: string; active: boolean }[];
  // The plan's launch: what it set out to buy, and a bought domain that couldn't be registered.
  launch: {
    launch_id: string;
    plan: PlanKey;
    domain: { kind: 'buy' | 'own'; name: string; price_per_year: number | null; free_first_year: boolean } | null;
    domain_failure: { domain: string; reason: string } | null;
  } | null;
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
export type DomainChoice = { kind: 'buy'; name: string; price_per_year: number; free_first_year_eligible: boolean }
  | { kind: 'own'; name: string; records: DnsRecord[] };

export type LaunchCheckout = { launch_id: string; checkouts: { product: 'plan' | 'domain'; url: string }[] };

export type MockCheckout = {
  id: string;
  email: string;
  item: { product: 'plan' | 'domain' | 'one_time'; plan?: PlanKey; price_per_year?: number; free_first_year?: boolean } | null;
  price_usd: number | null;
  project_id: number;
  domain: string | null;
};
