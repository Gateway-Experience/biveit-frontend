import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import Modal from 'src/components/common/Modal';
import { Button } from 'src/components/shadui/button';
import { Checkbox } from 'src/components/shadui/checkbox';
import { useStore } from 'src/state-store';
import { saveCookieConsent } from 'src/services/cookieConsent';
import { PATHS } from 'src/utils/constants';

// Intentions: the small cookie card in the bottom-left corner on a first visit, plus the preferences
// dialog behind its "Manage preferences" (also reachable later from the cookie policy page). Mounted once,
// app-wide, in main.tsx. Saying OK allows analytics; the dialog lets people keep just the essentials.
// References: services/cookieConsent.ts (where the choice lives), AppProvider (turns analytics on/off).

function CookiePreferencesForm({ isAnalyticsAllowedInitially, onSave }: {
  isAnalyticsAllowedInitially: boolean;
  onSave: (isAnalyticsAllowed: boolean) => void;
}) {
  const { t } = useTranslation();
  const [isAnalyticsAllowed, setIsAnalyticsAllowed] = useState(isAnalyticsAllowedInitially);

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='font-semibold'>{t('cookie_policy_essential_title')}</p>
          <p className='text-sm text-muted-foreground'>{t('cookie_preferences_essential_body')}</p>
        </div>
        <span className='shrink-0 text-sm text-muted-foreground'>{t('cookie_preferences_always_on')}</span>
      </div>
      <label className='flex cursor-pointer items-start justify-between gap-4'>
        <div>
          <p className='font-semibold'>{t('cookie_policy_analytics_title')}</p>
          <p className='text-sm text-muted-foreground'>{t('cookie_preferences_analytics_body')}</p>
        </div>
        <Checkbox className='mt-1' checked={isAnalyticsAllowed} onCheckedChange={setIsAnalyticsAllowed} />
      </label>
      <Button className='self-end' onClick={() => onSave(isAnalyticsAllowed)}>{t('cookie_preferences_save')}</Button>
    </div>
  );
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const cookieConsent = useStore(state => state.cookieConsent);
  const isPreferencesOpen = useStore(state => state.isCookiePreferencesOpen);
  const set = useStore(state => state.set);

  const saveChoice = (isAnalyticsAllowed: boolean) => {
    set({ cookieConsent: saveCookieConsent(isAnalyticsAllowed), isCookiePreferencesOpen: false });
  };

  return (
    <>
      {/* Hidden while the dialog is open so the two don't stack up. */}
      {!cookieConsent && !isPreferencesOpen && (
        <div
          role='region'
          aria-label={t('cookie_policy_title')}
          className='fixed bottom-4 left-4 z-50 w-[calc(100%-2rem)] max-w-xs rounded-surface glass-surface p-5 text-sm text-popover-foreground'
        >
          <p className='leading-relaxed'>
            {t('cookie_banner_text')}{' '}
            <Link to={PATHS.privacyPolicy} className='underline underline-offset-2 hover:opacity-80'>{t('privacy_policy_title')}</Link>
            {' · '}
            <Link to={PATHS.cookiePolicy} className='underline underline-offset-2 hover:opacity-80'>{t('cookie_policy_title')}</Link>
          </p>
          <Button variant='outline' className='mt-4 w-full' onClick={() => saveChoice(true)}>
            {t('cookie_banner_ok')}
          </Button>
          <Button variant='ghost' className='mt-1 w-full' onClick={() => set({ isCookiePreferencesOpen: true })}>
            {t('cookie_banner_manage')}
          </Button>
        </div>
      )}

      <Modal
        open={isPreferencesOpen}
        onClose={() => set({ isCookiePreferencesOpen: false })}
        title={t('cookie_preferences_title')}
        fullScreenMobile={false}
      >
        {/* Mounted only while open, so the checkbox starts from the saved choice every time. Undecided
            visitors start unticked — analytics is opt-in. */}
        {isPreferencesOpen && (
          <CookiePreferencesForm isAnalyticsAllowedInitially={Boolean(cookieConsent?.analytics)} onSave={saveChoice} />
        )}
      </Modal>
    </>
  );
}
