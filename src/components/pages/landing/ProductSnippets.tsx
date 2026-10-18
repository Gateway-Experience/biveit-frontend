import { useTranslation } from 'react-i18next';
import { MousePointer2Icon, SparklesIcon } from 'lucide-react';
import { cn } from 'cn';

// Intentions: small pieces of the product used as pictures on the landing page (the browser bar's dots, a
// snapshot of the builder chat), shared by the hero, the steps and the gallery.

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

export {
  BrowserDots,
  ChatPreviewCard,
};
