import { CN, GB, JP, KR, RU, VN } from 'country-flag-icons/react/3x2';

const USER_TYPES = {
  USER: 'USER',
  GUEST: 'GUEST',
};

const APP_NAME = 'Vib3';

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
};

export {
  APP_NAME,
  USER_TYPES,
  PATHS,
  MAIN_CONTENT_WIDTH_CLASS,
  SUPPORTED_LANGUAGES,
};
