import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, FastForwardIcon, ListChecksIcon, SparklesIcon, UndoIcon, XIcon } from 'lucide-react';

import Modal from 'src/components/common/Modal';
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

// [Pure] A word of encouragement for where the planning is at, or null early on. It follows the spec documents
// the agent has written so far (data -> flows -> pages, the order it plans in), so "almost there" is only
// said when it's true; before any of them exist, a few answered questions earn a "keep going".
function _pickEncouragementKey(answeredCount: number, specDocNames: string[]) {
  if (_.includes(specDocNames, 'pages.md')) {
    return 'chat_encourage_final';
  }
  if (_.includes(specDocNames, 'flows.md')) {
    return 'chat_encourage_almost';
  }
  if (_.includes(specDocNames, 'erd.md')) {
    return 'chat_encourage_halfway';
  }
  return answeredCount >= 3 ? 'chat_encourage_start' : null;
}

// Intentions: the agent's questions, one at a time, in place of the chat input (the BE won't take text until
// they're answered or dismissed). An agent message can hold several `ask_user` calls; their questions run
// as one sequence and are submitted together once, at the end (the BE wants the whole message answered in
// one go). The X dismisses from the current question on, which hands chat mode back without a reply.
// Mount with a key made of the calls' ids, so a new set of questions starts from a clean form.
// Ways out besides answering: "Previous question" (on the first question of the set, when an earlier one was
// answered) and "Skip questions & build now" both dismiss from here and then say so in the chat, in the user's
// own words, so the agent hears what they want. The "back" inside a set just steps back, nothing's sent yet.
export default function QuestionPanel({ interactions, onSubmit, onDismissAndSay, answeredQuestions, specDocNames }: {
  // The agent message's pending `ask_user` calls, in the order it asked them.
  interactions: ToolUseBlock[];
  // Resolves to whether it went through. On success nothing is pending any more and this unmounts.
  onSubmit: (answers: InteractionAnswer[]) => Promise<boolean>;
  // Dismisses with `answers` (built with an abort), then sends `text` as the user's message.
  onDismissAndSay: (answers: InteractionAnswer[], text: string) => Promise<boolean>;
  // Questions already answered earlier in the chat, oldest first (see getAnsweredQuestions).
  answeredQuestions: string[];
  // File names of the agent's documents so far, for the encouragement (see _pickEncouragementKey).
  specDocNames: string[];
}) {
  const { t } = useTranslation();
  const questions = flattenQuestions(interactions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => _.map(questions, () => EMPTY_QUESTION_DRAFT));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);

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

  // Dismisses from the current question on (earlier ones in this set still count), then says `text`.
  async function dismissAndSay(text: string) {
    setIsSkipConfirmOpen(false);
    setIsSubmitting(true);
    const isSent = await onDismissAndSay(buildSubmissionAnswers(interactions, drafts, { abortedAtIndex: currentIndex }), text);
    if (!isSent) {
      setIsSubmitting(false);
    }
  }

  const previousAnsweredQuestion = _.last(answeredQuestions);
  const encouragementKey = _pickEncouragementKey(_.size(answeredQuestions) + currentIndex, specDocNames);

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

      {encouragementKey && (
        <p data-encouragement={encouragementKey} className='-mt-1 flex items-center gap-1.5 text-xs font-medium text-brand-strong'>
          <SparklesIcon className='size-3.5' />
          {t(encouragementKey)}
        </p>
      )}

      <div>
        <p className='font-medium'>{question.question}</p>
        {/* Multi-select is easy to miss (people tick one and move on), so it gets a badge, not just grey text. */}
        {question.multi_select
          ? (
            <span className='mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-brand-strong'>
              <ListChecksIcon className='size-3.5' />
              {t('chat_question_hint_multi')}
            </span>
          )
          : <p className='mt-0.5 text-xs text-muted-foreground'>{t('chat_question_hint_single')}</p>}
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

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='ghost'
          size='sm'
          disabled={isSubmitting}
          onClick={() => setIsSkipConfirmOpen(true)}
          className='-ml-2 text-muted-foreground'
        >
          <FastForwardIcon data-icon='inline-start' />
          {t('chat_question_skip_all')}
        </Button>
        <div className='ml-auto flex items-center gap-2'>
          {currentIndex > 0 && (
            <Button variant='outline' size='sm' disabled={isSubmitting} onClick={() => setCurrentIndex(currentIndex - 1)}>
              <ChevronLeftIcon data-icon='inline-start' />
              {t('chat_question_back')}
            </Button>
          )}
          {/* An earlier question was answered in a previous round: going back means asking the agent for it again. */}
          {currentIndex === 0 && previousAnsweredQuestion && (
            <Button
              variant='outline'
              size='sm'
              disabled={isSubmitting}
              title={previousAnsweredQuestion}
              onClick={() => dismissAndSay(t('chat_go_back_message', { question: previousAnsweredQuestion }))}
            >
              <UndoIcon data-icon='inline-start' />
              {t('chat_question_previous')}
            </Button>
          )}
          <Button size='sm' disabled={!canAdvance} onClick={advance}>
            {t(isLastQuestion ? 'chat_question_submit' : 'chat_question_next')}
          </Button>
        </div>
      </div>

      <Modal
        open={isSkipConfirmOpen}
        onClose={() => setIsSkipConfirmOpen(false)}
        title={t('chat_skip_confirm_title')}
        fullScreenMobile={false}
        buttons={[
          <Button key='keep' variant='outline' onClick={() => setIsSkipConfirmOpen(false)}>{t('chat_skip_confirm_keep')}</Button>,
          <Button key='skip' onClick={() => dismissAndSay(t('chat_skip_message'))}>
            <FastForwardIcon data-icon='inline-start' />
            {t('chat_skip_confirm_go')}
          </Button>,
        ]}
      >
        <p className='text-muted-foreground'>{t('chat_skip_confirm_body')}</p>
      </Modal>
    </div>
  );
}
