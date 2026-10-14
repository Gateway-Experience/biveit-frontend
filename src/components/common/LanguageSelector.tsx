import { useTranslation } from 'react-i18next';
import { GlobeIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
import { useStore } from 'src/state-store';
import { useUpdateUser } from 'src/utils/hooks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';

// Keep in sync with SUPPORTED_LANGUAGES in AppProvider — that's where the bundles are loaded.
const languages = [
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'vi',
    name: 'Tiếng Việt',
    flag: '🇻🇳',
  },
];

// Intentions: a compact "🌐 EN" switcher. The choice is remembered across visits (i18next caches it
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
  const currentLanguage = languages.find(lang => lang.code === i18n.resolvedLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('language_select')}
        data-language={currentLanguage.code}
        render={<Button variant='ghost' size='sm' className={className} />}
      >
        <GlobeIcon />
        {/* Fixed width so the button (and whatever sits next to it) doesn't shift when the code changes. */}
        <span className='inline-block w-6 text-center'>{currentLanguage.code.toUpperCase()}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-[150px]'>
        {languages.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => selectLanguage(language.code)}
            className='flex items-center gap-2'
            data-selected={currentLanguage.code === language.code || undefined}
          >
            <span className='text-xl leading-none'>{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
