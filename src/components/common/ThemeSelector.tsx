import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { cn } from 'cn';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from 'src/components/shadui/dropdown-menu';
import { focusCheckedMenuItem } from 'src/utils/common';

const _THEMES = [
  { value: 'light', labelKey: 'theme_light', Icon: SunIcon },
  { value: 'dark', labelKey: 'theme_dark', Icon: MoonIcon },
  { value: 'system', labelKey: 'theme_system', Icon: MonitorIcon },
];

// Intentions: the light / dark switch, sitting next to the language switcher wherever that is (the sidebar, the
// public pages' top bar, the sign-in screens) and shaped like it. "System" follows the device's own setting.
// next-themes keeps the choice in this browser and puts the `dark` class on <html> (ThemeProvider); the landing site
// is a separate app and stays light.
// The menu's items are radio items: the choice in use carries a tick. (Plain items only had the menu's focus
// highlight, which sits on the first item when it opens -- so "Light" looked chosen even in dark mode.)
// `options.label`: the theme's name next to its icon (roomy spots like the sidebar), or just the icon.
// `options.side`: which side of the button the menu opens on.
export default function ThemeSelector({ className, options = {} }: {
  className?: string;
  options?: { label?: 'name' | 'none'; side?: 'top' | 'bottom' | 'right' };
}) {
  const { label = 'none', side = 'bottom' } = options;
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  // next-themes only knows the stored choice once mounted; until then show the default, so the first render matches.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const current = _THEMES.find(option => option.value === (isMounted ? theme : 'light')) || _THEMES[0];

  return (
    // The highlight starts on the choice in use (focusCheckedMenuItem).
    <DropdownMenu onOpenChange={isOpen => isOpen && focusCheckedMenuItem('theme')}>
      <DropdownMenuTrigger
        aria-label={t('theme_select')}
        data-theme-choice={current.value}
        render={<Button variant='ghost' size='sm' className={cn('text-sm', className)} />}
      >
        <current.Icon aria-hidden='true' className='size-4' />
        {label === 'name' && <span className='truncate'>{t(current.labelKey)}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent data-menu='theme' side={side} align='end' className='min-w-[160px]'>
        <DropdownMenuRadioGroup value={current.value} onValueChange={value => setTheme(value)}>
          {_THEMES.map(option => (
            // closeOnClick: radio items stay open after a pick by default; this is a pick-and-go menu.
            <DropdownMenuRadioItem key={option.value} value={option.value} closeOnClick data-theme-option={option.value}>
              <option.Icon aria-hidden='true' className='size-4' />
              {t(option.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
