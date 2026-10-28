import { create } from 'zustand';

import type { User } from 'src/types/user';
import { readCookieConsent, type CookieConsent } from 'src/services/cookieConsent';

// Global client state. Deliberately small — server data belongs in TanStack Query,
// this is for things the app itself owns.
type AppState = {
  user?: User | null;
  // Loaded from localStorage once here; after that, only CookieConsent.tsx changes it (and saves it).
  cookieConsent: CookieConsent | null;
  // The preferences dialog can be opened from the banner or from the cookie policy page.
  isCookiePreferencesOpen: boolean;
  // The new-project form is a modal over whatever page you're on (mounted once, in DefaultLayout), so any
  // "New project" button can open it without leaving the page.
  isNewProjectOpen: boolean;
  // Text to put in the project chat's box (focused, not sent) -- e.g. the launch dialog handing a question over to
  // the agent. The chat takes it in and clears it.
  chatPrefill: string | null;
  set: (partial: Partial<AppState>) => void;
};

const useStore = create<AppState>((set) => ({
  cookieConsent: readCookieConsent(),
  isCookiePreferencesOpen: false,
  isNewProjectOpen: false,
  chatPrefill: null,
  set,
}));

export {
  useStore,
};
