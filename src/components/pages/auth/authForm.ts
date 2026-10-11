// Validation shared by the login and register forms. The BE doesn't check the email format, so the FE has to.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export {
  EMAIL_PATTERN,
  MIN_PASSWORD_LENGTH,
};
