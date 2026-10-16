// Validation shared by the login and register forms. The BE doesn't check the email format, so the FE has to.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// The auth pages use pill-shaped fields and buttons (see AuthPageLayout).
const AUTH_INPUT_CLASS = 'rounded-full px-5';
const AUTH_SUBMIT_CLASS = 'mt-1 h-11 w-full rounded-full';

export {
  AUTH_INPUT_CLASS,
  AUTH_SUBMIT_CLASS,
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
};
