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

// How far the chat has played out, for `stage` below (each step shows everything before it too).
const CHAT_STAGES = { userMessage: 1, agentTyping: 2, agentMessage: 3, options: 4, pointer: 5, picked: 6 };
// Hidden-but-still-taking-its-place, so the card doesn't change size while the chat plays out.
const _PENDING_CLASS = 'translate-y-2 opacity-0';

// Intentions: a snapshot of the builder chat — someone casually describes their business and gets
// asked an easy, tap-to-answer question. It's markup rather than a screenshot so it stays crisp.
// `stage` (see CHAT_STAGES) plays it out a piece at a time: the message, the agent typing, its reply, the
// options, the pointer coming in, the pick. Left out, the whole finished snapshot shows.
function ChatPreviewCard({ className, stage = CHAT_STAGES.picked }: { className?: string; stage?: number }) {
  const { t } = useTranslation();
  const _revealClass = (fromStage: number) => cn('transition-all duration-500 ease-out', stage < fromStage && _PENDING_CLASS);
  const isPicked = stage >= CHAT_STAGES.picked;

  return (
    <div data-chatstage={stage} className={cn(SNAPSHOT_CARD_CLASS, 'p-4', className)}>
      <div className='flex items-center gap-2 text-xs font-semibold'>
        <span className='grid size-6 place-items-center rounded-full bg-primary text-primary-foreground'>
          <SparklesIcon className='size-3.5' />
        </span>
        {t('landing_scene_chat_title')}
      </div>
      <p className={cn('mt-3 ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-highlight px-3 py-2 text-sm', _revealClass(CHAT_STAGES.userMessage))}>
        {t('landing_scene_user_msg')}
      </p>
      {/* The reply's spot: three bouncing dots while the agent "types", then the reply itself (laid over the
          dots' bubble, so the space it needs is kept from the start). */}
      <div className={cn('relative mt-2 w-fit max-w-[88%]', _revealClass(CHAT_STAGES.agentTyping))}>
        <p className={cn('rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm transition-opacity duration-300', stage < CHAT_STAGES.agentMessage && 'opacity-0')}>
          {t('landing_scene_agent_msg')}
        </p>
        {stage === CHAT_STAGES.agentTyping && (
          <span className='absolute top-0 left-0 flex gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3'>
            {[0, 150, 300].map(delayMs => <span key={delayMs} className='size-1.5 animate-bounce rounded-full bg-foreground/40' style={{ animationDelay: `${delayMs}ms` }} />)}
          </span>
        )}
      </div>
      <div className='mt-3 flex flex-wrap gap-1.5'>
        {DEMO_OPTION_KEYS.map((optionKey, index) => (
          <span
            key={optionKey}
            // The options pop in one after another.
            style={{ transitionDelay: stage === CHAT_STAGES.options ? `${index * 120}ms` : undefined }}
            className={cn(
              'relative rounded-full border px-3 py-1 text-xs font-semibold',
              _revealClass(CHAT_STAGES.options),
              index === 0 && isPicked ? 'scale-105 border-primary bg-primary text-primary-foreground' : 'bg-card',
            )}
          >
            {t(optionKey)}
            {index === 0 && (
              // Glides in from the lower right and lands on the first option.
              <MousePointer2Icon
                className={cn(
                  'absolute -right-2 -bottom-3 size-4 fill-foreground text-foreground transition-all duration-700 ease-out',
                  stage < CHAT_STAGES.pointer && 'translate-x-10 translate-y-6 opacity-0',
                  stage === CHAT_STAGES.picked && 'scale-90',
                )}
              />
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export {
  BrowserDots,
  CHAT_STAGES,
  ChatPreviewCard,
};
