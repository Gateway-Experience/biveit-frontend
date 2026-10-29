import { CN, GB, JP, KR, RU, VN } from 'country-flag-icons/react/3x2';

const USER_TYPES = {
  USER: 'USER',
  GUEST: 'GUEST',
};

const APP_NAME = 'Biveit';

// The UI languages, in the order the language menu lists them. This is the one list: AppProvider loads
// a translation bundle for each code (from i18nMappings), and LanguageSelector shows these entries.
// `name` is the language's own name for itself, so people can spot theirs. `Flag` is an SVG flag (emoji
// flags show up as plain letters on Windows).
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', Flag: GB },
  { code: 'vi', name: 'Tiếng Việt', Flag: VN },
  { code: 'ko', name: '한국어', Flag: KR },
  { code: 'zh', name: '简体中文', Flag: CN },
  { code: 'ja', name: '日本語', Flag: JP },
  { code: 'ru', name: 'Русский', Flag: RU },
];

const MAIN_CONTENT_WIDTH_CLASS = 'max-w-4xl';

// The desktop sidebar's width, in px, when it's open, counting the 8px margin round the floating panel (so the panel
// itself is 240px). Fixed: it can't be dragged wider or narrower.
const SIDEBAR_WIDTH_PX = 256;

// What biveit costs, in USD — the one place prices live in the app (formatted for display by services/pricing).
// Every screen that mentions a price reads it from here: the Pricing page, the Deploy tab, Help. The landing site
// (biveit-landing, src/utils/constants.ts) has its own copy for its FAQ: change both together.
// References: the business side (what each option gets, how access works) is biveit-backend docs/plans/launch-flow.md.
//   oneTimePrice     pay once: the site's code to host yourself, plus the AI assistant for a month
//   monthlyPrice     subscription, billed monthly: we host and deploy it, the AI assistant stays on
//   yearlyPrice      the same subscription, billed yearly
//   domainFromPrice  the cheapest yearly price of a domain bought from us (domains are billed on their own)
//   yearlyDomainCredit  on the yearly plan, how much of the domain's price we cover: a cheaper domain is free, a
//                       dearer one costs only the difference
const PRICING = {
  oneTimePrice: 19,
  monthlyPrice: 19,
  yearlyPrice: 159,
  domainFromPrice: 10,
  yearlyDomainCredit: 20,
};

// Where people reach a human: the Help chat, the Pricing page's FAQ and the Terms all show it.
const SUPPORT_EMAIL = 'support@biveit.com';

// The site kinds the new-project form offers up front (bootstrap_data.site_kinds). Values are what the agent
// reads, so they stay in English; the labels are translated. The chat shows them back in the user's language.
const SITE_KIND_OPTIONS = [
  { value: 'landing page', labelKey: 'new_project_kind_landing' },
  { value: 'blog', labelKey: 'new_project_kind_blog' },
  { value: 'portfolio', labelKey: 'new_project_kind_portfolio' },
  { value: 'web app', labelKey: 'new_project_kind_web_app' },
];

// The query param that carries a site idea into the new-project form (/projects?idea=...), so someone who types
// their idea on the landing site finds the form open with it, after logging in. NewProjectModal reads it (and drops
// it from the URL); the landing site's prompt box (biveit-landing, HeroPrompt) sets it, with its own copy of this name.
const NEW_PROJECT_IDEA_PARAM = 'idea';

// Example site ideas, as i18n keys: typed out in the auth pages' showcase panel, as if someone were asking
// biveit for a site. (The landing site's prompt box uses the same ones, from its own copy of the strings.)
const EXAMPLE_IDEA_KEYS = ['auth_showcase_prompt_1', 'auth_showcase_prompt_2', 'auth_showcase_prompt_3', 'auth_showcase_prompt_4'];

const PATHS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  userProfile: '/user-profile',
  privacyPolicy: '/privacy-policy',
  termsOfService: '/terms-of-service',
  cookiePolicy: '/cookie-policy',
  projects: '/projects',
  trash: '/projects/trash',
  pricing: '/pricing',
  admin: '/admin',
  adminDomainTest: '/admin/domain-name-test',
  // The stand-in payment page (backend payments_mock only).
  mockCheckout: '/mock-checkout',
};

export {
  APP_NAME,
  USER_TYPES,
  PATHS,
  PRICING,
  SUPPORT_EMAIL,
  SITE_KIND_OPTIONS,
  NEW_PROJECT_IDEA_PARAM,
  EXAMPLE_IDEA_KEYS,
  MAIN_CONTENT_WIDTH_CLASS,
  SIDEBAR_WIDTH_PX,
  SUPPORTED_LANGUAGES,
};
