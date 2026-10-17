import { CN, GB, JP, KR, RU, VN } from 'country-flag-icons/react/3x2';

const USER_TYPES = {
  USER: 'USER',
  GUEST: 'GUEST',
};

const APP_NAME = 'VibeIt';

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

// The desktop sidebar's width, in px, when the user drags its edge: where it starts, and how far it goes.
// The width they settle on is remembered in localStorage under SIDEBAR_WIDTH_STORAGE_KEY.
const SIDEBAR_WIDTH_PX = { default: 256, min: 208, max: 480 };
const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar_width';

// What VibeIt costs, in USD — the one place prices live (formatted for display by services/pricing). Every
// screen that mentions a price reads it from here: the Pricing page, the Deploy tab, Help, the landing FAQ.
//   publishPrice     the regular one-time price to publish a site
//   salePublishPrice what it's sold for while there's a sale; null = no sale, publishPrice applies
//   monthlyPrice     charged every month after that
//   freeDomainBelow  a domain costing less than this is included free
const PRICING = {
  publishPrice: 49,
  salePublishPrice: 39 as number | null,
  monthlyPrice: 9,
  freeDomainBelow: 10,
};

const PATHS = {
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  userProfile: '/user-profile',
  privacyPolicy: '/privacy-policy',
  cookiePolicy: '/cookie-policy',
  projects: '/projects',
  newProject: '/projects/new',
  pricing: '/pricing',
};

export {
  APP_NAME,
  USER_TYPES,
  PATHS,
  PRICING,
  MAIN_CONTENT_WIDTH_CLASS,
  SIDEBAR_WIDTH_PX,
  SIDEBAR_WIDTH_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
};
