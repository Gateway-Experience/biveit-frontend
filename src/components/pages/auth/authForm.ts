// Validation shared by the login and register forms (and the profile page). The BE doesn't check the email format, so the FE has to.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// First / last name, each: the BE's USER_NAME_MAX_LENGTH (the columns' size).
const NAME_MAX_LENGTH = 100;

// The auth pages use pill-shaped fields and buttons (see AuthPageLayout).
const AUTH_INPUT_CLASS = 'rounded-full px-5';
const AUTH_SUBMIT_CLASS = 'mt-1 h-11 w-full rounded-full';

export {
  AUTH_INPUT_CLASS,
  AUTH_SUBMIT_CLASS,
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
  NAME_MAX_LENGTH,
};
