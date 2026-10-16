import { useTranslation } from 'react-i18next';
import { CircleCheckIcon, LockIcon, MousePointer2Icon, SparklesIcon, WandSparklesIcon } from 'lucide-react';
import { cn } from 'cn';

// Steps ticked off on the "building your site" card — the same chores listed under "Our part".
const BUILD_STEP_KEYS = ['landing_deal_ours_design', 'landing_deal_ours_booking', 'landing_deal_ours_hosting', 'landing_deal_ours_domain'];

const SNAPSHOT_CARD_CLASS = 'rounded-2xl border bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-sm';

// The first option is drawn as the one being picked.
const DEMO_OPTION_KEYS = ['landing_scene_option_yes', 'landing_scene_option_no', 'landing_scene_option_unsure'];

// The three little dots of a browser window's top bar.
function BrowserDots() {
  return (
    <div className='flex shrink-0 gap-1'>
      {[0, 1, 2].map(index => <span key={index} className='size-2 rounded-full bg-foreground/15' />)}
    </div>
  );
}

// Intentions: a snapshot of the builder chat — someone casually describes their business and gets
// asked an easy, tap-to-answer question. It's markup rather than a screenshot so it stays crisp.
function ChatPreviewCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'p-4', className)}>
      <div className='flex items-center gap-2 text-xs font-semibold'>
        <span className='grid size-6 place-items-center rounded-full bg-primary text-primary-foreground'>
          <SparklesIcon className='size-3.5' />
        </span>
        {t('landing_scene_chat_title')}
      </div>
      <p className='mt-3 ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-highlight px-3 py-2 text-sm'>{t('landing_scene_user_msg')}</p>
      <p className='mt-2 w-fit max-w-[88%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm'>{t('landing_scene_agent_msg')}</p>
      <div className='mt-3 flex flex-wrap gap-1.5'>
        {DEMO_OPTION_KEYS.map((optionKey, index) => (
          <span
            key={optionKey}
            className={cn(
              'relative rounded-full border px-3 py-1 text-xs font-semibold',
              index === 0 ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            {t(optionKey)}
            {index === 0 && <MousePointer2Icon className='absolute -right-2 -bottom-3 size-4 fill-foreground text-foreground' />}
          </span>
        ))}
      </div>
    </div>
  );
}

// The address bar of a freshly launched site.
function LiveSiteBadge({ domain, className }: { domain: string; className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'flex items-center gap-3 px-4 py-3', className)}>
      <BrowserDots />
      <span className='flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-sm text-muted-foreground'>
        <LockIcon className='size-3.5 shrink-0 text-success' />
        <span className='truncate'>{domain}</span>
      </span>
      <span className='flex shrink-0 items-center gap-1.5 text-sm font-semibold text-success'>
        <span className='size-2 rounded-full bg-success' />
        {t('landing_scene_live')}
      </span>
    </div>
  );
}

// The middle of the story: everything the user didn't have to do, ticked off.
function BuildProgressCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'p-4', className)}>
      <div className='flex items-center gap-2.5'>
        <span className='grid size-8 place-items-center rounded-lg bg-linear-to-br from-brand-light to-brand-deep text-primary-foreground'>
          <WandSparklesIcon className='size-4' />
        </span>
        <span className='flex-1 text-sm font-semibold'>{t('landing_build_card_title')}</span>
        <span className='rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success'>{t('landing_build_card_done')}</span>
      </div>
      <ul className='mt-3 flex flex-col gap-2 text-sm'>
        {BUILD_STEP_KEYS.map(stepKey => (
          <li key={stepKey} className='flex items-center gap-2'>
            <CircleCheckIcon className='size-4 shrink-0 text-primary' />
            {t(stepKey)}
          </li>
        ))}
      </ul>
      <div className='mt-3 h-1.5 rounded-full bg-linear-to-r from-brand-light via-primary to-brand-deep' />
    </div>
  );
}

// Original purpose: the landing hero's visual.
// Intentions: the whole pitch in three snapshots — you chat (tap an easy answer), we build (everything
// ticked off), and the site is live on its own address. Overlapping on desktop, stacked on small screens.
function HeroVisual() {
  const { t } = useTranslation();

  return (
    <div className='relative flex flex-col gap-4 lg:block lg:h-[540px]'>
      <ChatPreviewCard className='lg:absolute lg:top-0 lg:left-0 lg:w-[360px] lg:-rotate-2' />
      <BuildProgressCard className='lg:absolute lg:top-[45%] lg:right-0 lg:w-[290px] lg:rotate-2' />
      <LiveSiteBadge domain={t('landing_example_domain_moto')} className='lg:absolute lg:bottom-0 lg:left-0 lg:w-[360px]' />
    </div>
  );
}

export {
  BrowserDots,
  ChatPreviewCard,
  HeroVisual,
};
