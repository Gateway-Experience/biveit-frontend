// Intentions: the visitor's cookie choice, kept in localStorage so the banner doesn't come back on
// every visit. Only analytics is optional — essential cookies (the session) are always on.
// No record at all means they haven't decided yet: the banner shows and analytics stays off.
// References: components/common/CookieConsent.tsx (the banner + preferences dialog), services/analytics.

const _STORAGE_KEY = 'cookie_consent';

type CookieConsent = {
  analytics: boolean;
  decided_at: string; // ISO timestamp, so a future policy change can ask again for older choices
};

// localStorage can throw (private mode, blocked site data) — treat that as "not decided yet".
function readCookieConsent(): CookieConsent | null {
  try {
    const raw = window.localStorage.getItem(_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Returns the saved choice even if storing it failed, so the current visit still honours it.
function saveCookieConsent(analytics: boolean): CookieConsent {
  const consent = { analytics, decided_at: new Date().toISOString() };
  try {
    window.localStorage.setItem(_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Nothing to do: the banner will just ask again next visit.
  }
  return consent;
}

export {
  readCookieConsent,
  saveCookieConsent,
};

export type { CookieConsent };
