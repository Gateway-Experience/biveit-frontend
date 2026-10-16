import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

import { Button } from 'src/components/shadui/button';
import { Checkbox } from 'src/components/shadui/checkbox';
import { Input } from 'src/components/shadui/input';
import { RadioGroup, RadioGroupItem } from 'src/components/shadui/radio-group';
import {
  EMPTY_QUESTION_DRAFT, buildSubmissionAnswers, flattenQuestions, isQuestionDraftComplete, type QuestionDraft,
} from 'src/services/chatQuestions';
import { CHAT_TEXT_SIZE_CLASS } from 'src/components/pages/projects/chat/chatStyles';
import type { InteractionAnswer, ToolUseBlock } from 'src/types/chat';

// One option as a full-width clickable row; the radio/checkbox inside carries the checked state.
const _OPTION_ROW_CLASS = `flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${CHAT_TEXT_SIZE_CLASS} transition-colors hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/15 has-disabled:pointer-events-none has-disabled:opacity-60`;

// Intentions: the agent's questions, one at a time, in place of the chat input (the BE won't take text until
// they're answered or dismissed). An agent message can hold several `ask_user` calls; their questions run
// as one sequence and are submitted together once, at the end (the BE wants the whole message answered in
// one go). The X dismisses from the current question on, which hands chat mode back without a reply.
// Mount with a key made of the calls' ids, so a new set of questions starts from a clean form.
export default function QuestionPanel({ interactions, onSubmit }: {
  // The agent message's pending `ask_user` calls, in the order it asked them.
  interactions: ToolUseBlock[];
  // Resolves to whether it went through. On success nothing is pending any more and this unmounts.
  onSubmit: (answers: InteractionAnswer[]) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const questions = flattenQuestions(interactions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => _.map(questions, () => EMPTY_QUESTION_DRAFT));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questions[currentIndex];
  const draft = drafts[currentIndex];
  const isLastQuestion = currentIndex === _.size(questions) - 1;
  const canAdvance = isQuestionDraftComplete(question, draft) && !isSubmitting;

  function updateCurrentDraft(patch: Partial<QuestionDraft>) {
    setDrafts(previousDrafts => _.map(previousDrafts, (existing, index) => (index === currentIndex ? { ...existing, ...patch } : existing)));
  }

  async function submitAnswers(answers: InteractionAnswer[]) {
    setIsSubmitting(true);
    const isSent = await onSubmit(answers);
    // Only reached usefully on failure — on success the panel is on its way out.
    if (!isSent) {
      setIsSubmitting(false);
    }
  }

  function advance() {
    if (!canAdvance) {
      return;
    }
    if (isLastQuestion) {
      submitAnswers(buildSubmissionAnswers(interactions, drafts));
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  return (
    <div
      data-component='question-panel'
      data-interactionids={_.map(interactions, 'id').join(',')}
      data-questionindex={currentIndex}
      className='flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs animate-in fade-in-0 slide-in-from-bottom-1 dark:bg-input/30'
    >
      <div className='flex items-center justify-between gap-3'>
        <span className='text-[0.625rem] font-bold tracking-[0.14em] text-muted-foreground uppercase'>
          {t('chat_question_progress', { current: currentIndex + 1, total: _.size(questions) })}
        </span>
        <Button
          variant='ghost'
          size='icon-xs'
          disabled={isSubmitting}
          aria-label={t('chat_question_dismiss')}
          title={t('chat_question_dismiss')}
          onClick={() => submitAnswers(buildSubmissionAnswers(interactions, drafts, { abortedAtIndex: currentIndex }))}
        >
          <XIcon />
        </Button>
      </div>

      <div>
        <p className='font-medium'>{question.question}</p>
        <p className='mt-0.5 text-xs text-muted-foreground'>
          {t(question.multi_select ? 'chat_question_hint_multi' : 'chat_question_hint_single')}
        </p>
      </div>

      <div className='flex flex-col gap-1.5'>
        {question.multi_select
          ? (
            <div role='group' aria-label={question.question} className='flex flex-col gap-1.5'>
              {_.map(question.options, option => (
                <label key={option} data-option={option} className={_OPTION_ROW_CLASS}>
                  <Checkbox
                    checked={_.includes(draft.selected, option)}
                    disabled={isSubmitting}
                    onCheckedChange={() => updateCurrentDraft({ selected: _.xor(draft.selected, [option]) })}
                  />
                  {option}
                </label>
              ))}
            </div>
          )
          : (
            <RadioGroup
              aria-label={question.question}
              // Nothing picked (or a custom answer typed instead) reads as no selection.
              value={_.first(draft.selected) ?? null}
              // Single-select takes one answer: picking an option replaces any custom text.
              onValueChange={value => updateCurrentDraft({ selected: [value as string], custom: '' })}
              className='gap-1.5'
            >
              {_.map(question.options, option => (
                <label key={option} data-option={option} className={_OPTION_ROW_CLASS}>
                  <RadioGroupItem value={option} disabled={isSubmitting} />
                  {option}
                </label>
              ))}
            </RadioGroup>
          )}
        {question.allow_custom && (
          <Input
            value={draft.custom}
            disabled={isSubmitting}
            placeholder={t('chat_question_custom_placeholder')}
            // Single-select: typing your own answer replaces the picked option.
            onChange={e => updateCurrentDraft(question.multi_select
              ? { custom: e.target.value }
              : { custom: e.target.value, selected: [] })}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                advance();
              }
            }}
            className='h-10'
          />
        )}
      </div>

      <div className='flex items-center justify-end gap-2'>
        {currentIndex > 0 && (
          <Button variant='ghost' size='sm' disabled={isSubmitting} onClick={() => setCurrentIndex(currentIndex - 1)}>
            {t('chat_question_back')}
          </Button>
        )}
        <Button size='sm' disabled={!canAdvance} onClick={advance}>
          {t(isLastQuestion ? 'chat_question_submit' : 'chat_question_next')}
        </Button>
      </div>
    </div>
  );
}
