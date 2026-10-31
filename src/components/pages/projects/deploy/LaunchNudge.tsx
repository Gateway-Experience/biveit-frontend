import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RocketIcon, XIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';

// Original purpose: making going live hard to miss. After the build's signed off, people kept asking the chat to
// "go live" because the Deploy tab sat unnoticed above a long conversation; this sits right above the chat box,
// where they're looking, and takes them there.
// Shown by the chat while nothing's launched yet (and the agent isn't mid-reply). Dismissing hides it until the
// page is opened again.
// `onOpenDeploy` switches to the Deploy tab, wherever it is (the chat's own tabs, or the side panel).
export default function LaunchNudge({ onOpenDeploy }: { onOpenDeploy: () => void }) {
  const { t } = useTranslation();
  const [isDismissed, setIsDismissed] = useState(false);
  if (isDismissed) {
    return null;
  }
  return (
    <div
      data-component='launch-nudge'
      className='mb-2 flex items-center gap-3 rounded-2xl border border-primary/50 bg-primary/15 py-2 pr-2 pl-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500'
    >
      <span className='grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'>
        <RocketIcon className='size-4' />
      </span>
      <p className='min-w-0 flex-1 text-sm font-medium'>{t('launch_nudge_text')}</p>
      <Button size='sm' onClick={onOpenDeploy} data-action='open-deploy'>{t('launch_nudge_cta')}</Button>
      <Button variant='ghost' size='icon-xs' className='text-muted-foreground' aria-label={t('launch_nudge_dismiss')} onClick={() => setIsDismissed(true)}>
        <XIcon />
      </Button>
    </div>
  );
}
