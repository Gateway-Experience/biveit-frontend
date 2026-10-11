import { PATHS } from 'src/utils/constants';

// [Pure] Where to send the user after logging in, taken from the `?next=` param. Only plain app paths
// pass — `//evil.com`, `/\evil.com`, absolute URLs or anything with whitespace would turn the login
// page into an open redirect, so they fall back to `/` (same rule the BE applies to Google's `next`).
function getSafeNextPath(rawNextPath?: string | null) {
  const isAppPath = !!rawNextPath && /^\/(?![/\\])/.test(rawNextPath) && !/\s/.test(rawNextPath);
  return isAppPath ? rawNextPath : '/';
}

// [Pure] Login URL that brings the user back to `returnToPath` afterwards (e.g. the page a
// ProtectedRoute bounced them from). Pass pathname + search + hash to come back to the exact spot.
function buildLoginPath(returnToPath?: string) {
  return returnToPath && returnToPath !== '/'
    ? `${PATHS.login}?next=${encodeURIComponent(returnToPath)}`
    : PATHS.login;
}

export {
  getSafeNextPath,
  buildLoginPath,
};
