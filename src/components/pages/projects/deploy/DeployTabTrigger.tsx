import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { RocketIcon } from 'lucide-react';

import { TabsTrigger } from 'src/components/shadui/tabs';

// [Pure] The rocket-body shape: a softly rounded tail on the left, the body stretching to fit the label, and a curved
// nose on the right. The nose is its own fixed-size piece, so a longer label (Публикация) only lengthens the body
// and never squashes the point.
function _renderRocketShape(className: string) {
  return (
    <span aria-hidden='true' className={cn('absolute inset-x-0 inset-y-1.5 flex', className)}>
      <span className='flex-1 rounded-l-[11px] bg-primary' />
      {/* Sized inline: the tab trigger shrinks any svg without a `size-*` class to an icon's 16px. */}
      <svg viewBox='0 0 14 32' preserveAspectRatio='none' className='shrink-0 fill-primary' style={{ width: 14, height: '100%' }}>
        <path d='M0 0 C7 0 14 11 14 16 C14 21 7 32 0 32 Z' />
      </svg>
    </span>
  );
}

// Intentions: the Deploy tab's button, in both places it shows (beside the preview, or in the chat's own tabs on
// narrow screens). Until the site is launched it's the one thing to do next, and a plain tab label got lost next
// to a long chat -- so it becomes a lavender rocket body, pointing forward, with a lavender echo of itself swelling
// out and fading behind it (`deploy-tab-echo` in styles/index.css). Once there's a launch under way it's a plain
// tab again.
// The shape is drawn behind the label rather than wrapped round it, so the label keeps a plain tab's place; the
// extra right padding is the nose, keeping the label centred on the body. The echo moves, the button never does.
// They're spans of their own, not the trigger's background: the line tabs force a transparent background on triggers.
// `isLaunchPending`: launched nothing yet (the launch status's `not_paid` stage).
export default function DeployTabTrigger({ isLaunchPending }: { isLaunchPending: boolean }) {
  const { t } = useTranslation();
  if (!isLaunchPending) {
    return <TabsTrigger value='deploy' className='flex-none px-3'>{t('chat_tab_deploy')}</TabsTrigger>;
  }
  return (
    <TabsTrigger value='deploy' data-launch-pending className='flex-none pr-6 pl-3.5 text-primary-foreground hover:text-primary-foreground dark:text-primary-foreground dark:hover:text-primary-foreground dark:data-active:text-primary-foreground'>
      {_renderRocketShape('deploy-tab-echo')}
      {_renderRocketShape('')}
      <RocketIcon className='relative size-3.5' />
      <span className='relative'>{t('chat_tab_deploy')}</span>
    </TabsTrigger>
  );
}
