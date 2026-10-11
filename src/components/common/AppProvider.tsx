import { useEffect, useState } from 'react';
import i18next from 'i18next';
import _ from 'lodash';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { callBe } from 'src/utils/request';
import { useStore } from 'src/state-store';
import FullScreenLoading from 'src/components/common/FullScreenLoading';
import i18nMappings from 'src/utils/i18nMappings';
import { initAnalytics, identifyUser } from 'src/services/analytics';

// i18nMappings is keyed by text, then language. Flip it into one resource bundle per language;
// keys missing a translation are left out so i18next falls back to the default language for them.
const SUPPORTED_LANGUAGES = ['en', 'vi'];
const i18nResources = _.fromPairs(_.map(SUPPORTED_LANGUAGES, language => [
  language,
  { translation: _.omitBy(_.mapValues(i18nMappings, language), _.isNil) },
]));

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const set = useStore(state => state.set);
  const user = useStore(state => state.user);
  const [initialized, setInitialized] = useState(false);

  // All initialization should be done here.
  useEffect(() => {
    if (initialized) {
      return;
    }
    initAnalytics();
    i18next
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        // No forced `lng`: the detector restores the language the user picked last time (it's cached
        // in localStorage by changeLanguage), and first-time visitors get the env default.
        fallbackLng: import.meta.env.VITE_APP_LANGUAGE || 'en',
        supportedLngs: SUPPORTED_LANGUAGES,
        detection: { order: ['localStorage'], caches: ['localStorage'] },
        resources: i18nResources,
      });
    callBe('/me')
      .then(data => {
        set({ user: data });
      })
      .catch(e => {
        if (e.code === 401) {
          set({ user: null });
          // No session at all, so mint a guest. The BE sets the guest's session cookie itself.
          if (JSON.parse(import.meta.env.VITE_CREATE_GUEST_ACCOUNT)) {
            callBe({
              url: '/user/register-guest',
              method: 'POST',
            }).then(({ user }) => {
              set({ user });
            });
          }
        } else {
          return Promise.reject(e);
        }
      })
      .finally(() => {
        setInitialized(true);
      });
  }, [set, initialized, setInitialized]);

  // Keeps analytics attribution in step with whoever is signed in. Logout clears `user`,
  // and resetAnalytics() is called there directly since identify() has no "nobody" state.
  useEffect(() => {
    identifyUser(user);
  }, [user]);

  if (!initialized) {
    return <FullScreenLoading loading={true} />;
  }

  return (
    <div data-userid={_.get(user, '_id', '')}>
      {children}
    </div>
  );
}
