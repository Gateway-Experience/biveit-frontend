import { useTranslation } from 'react-i18next';
import { cn } from 'cn';

import { Button } from 'src/components/shadui/button';
import { useStore } from 'src/state-store';
import { useUpdateUser } from 'src/utils/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';
import { focusCheckedMenuItem } from 'src/utils/common';
import { SUPPORTED_LANGUAGES } from 'src/utils/constants';


// Intentions: a compact "[flag] EN" switcher. The choice is remembered across visits (i18next caches it
// in localStorage — see the detector setup in AppProvider), and saved on the user record too
// (PATCH /me), since the agent talks to the user in their language.
// `className` styles the trigger button, e.g. to fit a coloured bar.
// `options.label`: what goes next to the flag: the language's code ("EN", the default), its own name
// ("English", for roomier spots like the sidebar), or nothing (a tight spot like the collapsed sidebar).
// `options.side`: which side of the button the menu opens on.
// The menu's items are radio items: the language in use carries a tick (the focus highlight alone sits on the first
// item when the menu opens, which made English look chosen whatever the language).
export default function LanguageSelector({ className, options = {} }: {
  className?: string;
  options?: { label?: 'code' | 'name' | 'none'; side?: 'top' | 'bottom' | 'right' };
}) {
  const { label = 'code', side = 'bottom' } = options;
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
    // The highlight starts on the choice in use (focusCheckedMenuItem).
    <DropdownMenu onOpenChange={isOpen => isOpen && focusCheckedMenuItem('language')}>
      <DropdownMenuTrigger
        aria-label={t('language_select')}
        data-language={currentLanguage.code}
        // Same text size as regular buttons (the `sm` size shrinks it), so "EN" shares a baseline with neighbours like "Log in".
        render={<Button variant='ghost' size='sm' className={cn('text-sm', className)} />}
      >
        <currentLanguage.Flag aria-hidden='true' className='h-3.5 w-auto rounded-[2px] shadow-[0_0_0_1px_var(--border)]' />
        {label === 'name' && <span data-languagename className='truncate'>{currentLanguage.name}</span>}
        {/* Fixed width so the button (and whatever sits next to it) doesn't shift when the code changes. */}
        {label === 'code' && <span className='inline-block w-6 text-center'>{currentLanguage.code.toUpperCase()}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent data-menu='language' side={side} align='end' className='max-h-[70svh] min-w-[180px] overflow-y-auto'>
        <DropdownMenuRadioGroup value={currentLanguage.code} onValueChange={code => selectLanguage(code)}>
          {SUPPORTED_LANGUAGES.map(language => (
            // closeOnClick: radio items stay open after a pick by default; this is a pick-and-go menu.
            <DropdownMenuRadioItem key={language.code} value={language.code} closeOnClick data-language-option={language.code}>
              <language.Flag aria-hidden='true' className='h-4 w-auto rounded-[2px] shadow-[0_0_0_1px_var(--border)]' />
              {language.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
