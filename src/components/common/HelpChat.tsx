import { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { ArrowUpIcon, LifeBuoyIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
import { Input } from 'src/components/shadui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from 'src/components/shadui/sheet';
import { HELP_TOPICS, findHelpTopic } from 'src/services/helpTopics';
import { getPriceLabels } from 'src/services/pricing';

// What's been said in the help chat. Answers keep the topic id, not the text, so switching language
// re-words the whole conversation.
type HelpEntry = { kind: 'question'; text: string } | { kind: 'answer'; topicId: string } | { kind: 'no-match' };

const _BUBBLE_CLASS = 'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed';

// Intentions: a small help desk about using biveit itself (not the site being built: that's the project
// chat's job). Ask in your own words or tap a topic; answers come from the curated topics in helpTopics,
// so they're always right about the product, and anything unknown gets an honest "not sure" plus the
// list of what it can help with. Lives in a side sheet so it can be opened from anywhere.
// Original purpose: user feedback asked for a "chat button to ask how to use the website".
export default function HelpChat({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const [entries, setEntries] = useState<HelpEntry[]>([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // The topics in the user's language, for matching and for the chips.
  const topics = HELP_TOPICS.map(topic => ({
    ...topic,
    question: t(`help_q_${topic.id}`),
    answer: t(`help_a_${topic.id}`, getPriceLabels(i18n.language)),
  }));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  // `topicId` when a chip was tapped (no need to guess then).
  const ask = (text: string, topicId?: string) => {
    const question = _.trim(text);
    if (!question) {
      return;
    }
    const matchedTopicId = topicId ?? findHelpTopic(question, topics);
    setEntries(previous => [
      ...previous,
      { kind: 'question', text: question },
      matchedTopicId ? { kind: 'answer', topicId: matchedTopicId } : { kind: 'no-match' },
    ]);
    setDraft('');
  };

  const renderTopicChips = () => (
    <div className='flex flex-wrap gap-1.5'>
      {_.map(topics, topic => (
        <button
          key={topic.id}
          type='button'
          data-topicid={topic.id}
          onClick={() => ask(topic.question, topic.id)}
          className='cursor-pointer rounded-full border bg-card px-3.5 py-1.5 text-left text-sm font-medium transition-colors hover:border-primary hover:bg-primary/10'
        >
          {topic.question}
        </button>
      ))}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' data-component='help-chat' className='w-full gap-0 p-0 sm:max-w-md'>
        <SheetHeader className='flex-row items-center gap-3 border-b px-5 py-4'>
          <span className='grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'>
            <LifeBuoyIcon className='size-4.5' />
          </span>
          <div>
            <SheetTitle className='font-heading'>{t('help_title')}</SheetTitle>
            <SheetDescription className='text-xs'>{t('help_subtitle')}</SheetDescription>
          </div>
        </SheetHeader>

        <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5'>
          <p className={cn(_BUBBLE_CLASS, 'bg-muted')}>{t('help_greeting')}</p>
          {renderTopicChips()}

          {_.map(entries, (entry, index) => {
            if (entry.kind === 'question') {
              return <p key={index} className={cn(_BUBBLE_CLASS, 'self-end bg-primary text-primary-foreground')}>{entry.text}</p>;
            }
            if (entry.kind === 'answer') {
              return (
                <p key={index} data-topicid={entry.topicId} className={cn(_BUBBLE_CLASS, 'bg-muted animate-in fade-in-0 slide-in-from-bottom-1')}>
                  {_.find(topics, { id: entry.topicId })?.answer}
                </p>
              );
            }
            return (
              <div key={index} data-nomatch className='flex flex-col gap-2 animate-in fade-in-0 slide-in-from-bottom-1'>
                <p className={cn(_BUBBLE_CLASS, 'bg-muted')}>{t('help_no_match')}</p>
                {renderTopicChips()}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className='border-t px-5 py-4'>
          <p className='mb-2.5 text-xs text-muted-foreground'>{t('help_project_hint')}</p>
          <form
            onSubmit={event => {
              event.preventDefault();
              ask(draft);
            }}
            className='flex items-center gap-2'
          >
            <Input value={draft} onChange={event => setDraft(event.target.value)} placeholder={t('help_placeholder')} aria-label={t('help_placeholder')} className='rounded-full px-4' />
            <Button type='submit' size='icon' aria-label={t('help_send')} disabled={!_.trim(draft)} className='shrink-0 rounded-full'>
              <ArrowUpIcon />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
