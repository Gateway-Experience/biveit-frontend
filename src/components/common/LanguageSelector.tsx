import { useTranslation } from 'react-i18next';
import { GlobeIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
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
// in localStorage — see the detector setup in AppProvider).
export default function LanguageSelector() {
  const { t, i18n } = useTranslation();

  // `resolvedLanguage` is the bundle actually in use, so a stray detected code still maps to one of ours.
  const currentLanguage = languages.find(lang => lang.code === i18n.resolvedLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('language_select')}
        data-language={currentLanguage.code}
        render={<Button variant='ghost' size='sm' />}
      >
        <GlobeIcon />
        {currentLanguage.code.toUpperCase()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-[150px]'>
        {languages.map(language => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => i18n.changeLanguage(language.code)}
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
