import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import { useStore } from 'src/state-store';
import { useUpdateUser } from 'src/utils/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';
import { SUPPORTED_LANGUAGES } from 'src/utils/constants';


// Intentions: a compact "[flag] EN" switcher. The choice is remembered across visits (i18next caches it
// in localStorage — see the detector setup in AppProvider), and saved on the user record too
// (PATCH /me), since the agent talks to the user in their language.
// `className` styles the trigger button, e.g. to fit a coloured bar.
export default function LanguageSelector({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const user = useStore(state => state.user);
  const updateUser = useUpdateUser();

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    // Best effort: the UI has already switched, a failed save only means the record keeps the old one.
    if (user && user.language !== code) {
      updateUser({ language: code }).catch(() => {});
    }
  };

  // `resolvedLanguage` is the bundle actually in use, so a stray detected code still maps to one of ours.
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.resolvedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('language_select')}
        data-language={currentLanguage.code}
        // Same text size as regular buttons (the `sm` size shrinks it), so "EN" shares a baseline with neighbours like "Log in".
        render={<Button variant='ghost' size='sm' className={cn('text-sm', className)} />}
      >
        <currentLanguage.Flag aria-hidden='true' className='h-3.5 w-auto rounded-[2px] shadow-[0_0_0_1px_var(--border)]' />
        {/* Fixed width so the button (and whatever sits next to it) doesn't shift when the code changes. */}
        <span className='inline-block w-6 text-center'>{currentLanguage.code.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='max-h-[70svh] min-w-[180px] overflow-y-auto'>
        {SUPPORTED_LANGUAGES.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => selectLanguage(language.code)}
            className='flex items-center gap-2'
            data-selected={currentLanguage.code === language.code || undefined}
          >
            <language.Flag aria-hidden='true' className='h-4 w-auto rounded-[2px] shadow-[0_0_0_1px_var(--border)]' />
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
