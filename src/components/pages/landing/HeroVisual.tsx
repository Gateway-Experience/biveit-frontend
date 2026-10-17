import { useTranslation } from 'react-i18next';
import { CircleCheckIcon, LockIcon, MousePointer2Icon, SparklesIcon, WandSparklesIcon } from 'lucide-react';
import { cn } from 'cn';

import ScaledFrame from 'src/components/common/ScaledFrame';
import { MotoRentalSite } from 'src/components/pages/landing/ExampleSites';
import { APP_NAME } from 'src/utils/constants';

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

// Step one of the story: the user's whole contribution, one sentence in a prompt box.
function PromptCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'p-4', className)}>
      <p className='flex items-center gap-1.5 text-xs font-semibold text-muted-foreground'>
        <SparklesIcon className='size-3.5 text-brand-strong' />
        {t('landing_hero_prompt_label')}
      </p>
      <p className='mt-2 rounded-xl border bg-background px-3 py-2.5 text-sm'>
        {t('landing_scene_user_msg')}
        <span className='ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-primary' />
      </p>
      <div className='mt-3 flex justify-end'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground'>
          <WandSparklesIcon className='size-3.5' />
          {t('landing_hero_prompt_send')}
        </span>
      </div>
    </div>
  );
}

// Intentions: the payoff, the finished site in a browser on its own (live) address. A "VibeIt" cursor is
// still at work on it, so it reads as a site that got built for you, not a stock screenshot.
function GeneratedSiteWindow({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'overflow-hidden', className)}>
      <div className='flex items-center gap-3 border-b px-3 py-2'>
        <BrowserDots />
        <span className='flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground'>
          <LockIcon className='size-3 shrink-0 text-success' />
          <span className='truncate'>{t('landing_example_domain_moto')}</span>
        </span>
        <span className='flex shrink-0 items-center gap-1.5 text-xs font-semibold text-success'>
          <span className='size-2 rounded-full bg-success' />
          {t('landing_scene_live')}
        </span>
      </div>
      <div className='relative'>
        <ScaledFrame baseWidth={640} baseHeight={400}>
          <MotoRentalSite />
        </ScaledFrame>
        <span className='absolute top-[13%] left-[47%] flex items-start'>
          <MousePointer2Icon className='size-5 fill-brand-strong text-brand-strong' />
          <span className='mt-4 -ml-1 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-md'>
            <SparklesIcon className='size-3' />
            {APP_NAME}
          </span>
        </span>
      </div>
    </div>
  );
}

// The middle of the story: everything the user didn't have to do, ticked off.
function BuildProgressCard({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={cn(SNAPSHOT_CARD_CLASS, 'p-4', className)}>
      <div className='flex items-center gap-2.5'>
        <span className='grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground'>
          <WandSparklesIcon className='size-4' />
        </span>
        <span className='flex-1 text-sm font-semibold'>{t('landing_build_card_title')}</span>
        <span className='rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success'>{t('landing_build_card_done')}</span>
      </div>
      <ul className='mt-3 flex flex-col gap-2 text-sm'>
        {BUILD_STEP_KEYS.map(stepKey => (
          <li key={stepKey} className='flex items-center gap-2'>
            <CircleCheckIcon className='size-4 shrink-0 text-brand-strong' />
            {t(stepKey)}
          </li>
        ))}
      </ul>
      <div className='mt-3 h-1.5 rounded-full bg-linear-to-r from-brand-light via-brand-strong to-brand-deep' />
    </div>
  );
}

// Original purpose: the landing hero's visual.
// Intentions: the whole pitch at a glance, read top to bottom. You type one sentence, we build it
// (everything ticked off), and a real-looking site is live on its own address. Slightly overlapping on desktop, stacked on small screens.
function HeroVisual() {
  return (
    <div className='flex flex-col gap-4 lg:gap-0'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0'>
        <PromptCard className='relative z-10 lg:w-[272px] lg:shrink-0 lg:-rotate-1' />
        <BuildProgressCard className='relative z-20 lg:mt-10 lg:-ml-3 lg:flex-1 lg:rotate-2' />
      </div>
      {/* Tucked slightly under the cards above; in normal flow so longer translations just push it down. */}
      <GeneratedSiteWindow className='relative z-30 lg:-mt-3 lg:ml-[4%]' />
    </div>
  );
}

export {
  BrowserDots,
  ChatPreviewCard,
  HeroVisual,
};
