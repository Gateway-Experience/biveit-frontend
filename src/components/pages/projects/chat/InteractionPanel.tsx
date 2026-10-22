import { useState } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, FastForwardIcon, ListChecksIcon, SparklesIcon, UndoIcon, XIcon } from 'lucide-react';

import Modal from 'src/components/common/Modal';
import { Spinner } from 'src/components/common/Spinner';
import { Button } from 'src/components/shadui/button';
import { Checkbox } from 'src/components/shadui/checkbox';
import { Input } from 'src/components/shadui/input';
import { RadioGroup, RadioGroupItem } from 'src/components/shadui/radio-group';
import {
  APPROVAL_ACTION_TEXT_KEYS, buildSubmissionAnswers, flattenInteractionItems, getEmptyDraft, getQuestionOptions,
  isQuestionDraftComplete,
  type ActionDraft, type InteractionDraft, type QuestionDraft,
} from 'src/services/chatInteractions';
import { CHAT_TEXT_SIZE_CLASS } from 'src/components/pages/projects/chat/chatStyles';
import type { ApprovalDecision, InteractionAnswer, RequestedAction, ToolUseBlock } from 'src/types/chat';

// One option as a full-width clickable row; the radio/checkbox inside carries the checked state.
const _OPTION_ROW_CLASS = `flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${CHAT_TEXT_SIZE_CLASS} transition-colors hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/15 has-disabled:pointer-events-none has-disabled:opacity-60`;

// An option's label, with its subtitle underneath when it has one (agent2's questions carry them).
function OptionText({ label, description }: { label: string; description?: string }) {
  if (!description) {
    return <>{label}</>;
  }
  return (
    <span className='flex flex-col gap-0.5'>
      <span>{label}</span>
      <span className='text-xs text-muted-foreground'>{description}</span>
    </span>
  );
}

const _STEP_LABEL_CLASS = 'text-[0.625rem] font-bold tracking-[0.14em] text-muted-foreground uppercase';

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

// Intentions: one action the agent asks the user to decide on. An approval (approve the spec, sign off the
// site) is two buttons: approve, or keep iterating (the agent just hears it). An action we don't know yet
// can't be done from here, so it only offers a skip — the user mustn't be stuck behind it.
// `decision` = the button clicked, kept so it can show the spinner while sending.
function ActionStep({ action, decision, isSubmitting, hasBack, onBack, onDecide, onSkip }: {
  action: RequestedAction;
  decision: ApprovalDecision | null;
  isSubmitting: boolean;
  hasBack: boolean;
  onBack: () => void;
  onDecide: (decision: ApprovalDecision) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const textKeys = APPROVAL_ACTION_TEXT_KEYS[action.name];
  const backButton = hasBack && (
    <Button variant='outline' size='sm' disabled={isSubmitting} onClick={onBack}>
      <ChevronLeftIcon data-icon='inline-start' />
      {t('chat_question_back')}
    </Button>
  );

  if (!textKeys) {
    return (
      <>
        <p className='font-medium'>{t('chat_action_unknown_title')}</p>
        <div className='flex items-center justify-end gap-2'>
          {backButton}
          <Button variant='outline' size='sm' disabled={isSubmitting} onClick={onSkip}>{t('chat_action_skip')}</Button>
        </div>
      </>
    );
  }
  return (
    <>
      <div>
        <p className='font-medium'>{t(textKeys.title)}</p>
        <p className='mt-0.5 text-xs text-muted-foreground'>{t(textKeys.hint)}</p>
      </div>
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {backButton}
        <Button variant='outline' size='sm' disabled={isSubmitting} onClick={() => onDecide('iterate')}>
          {isSubmitting && decision === 'iterate' && <Spinner data-icon='inline-start' />}
          {t('chat_action_iterate')}
        </Button>
        <Button size='sm' disabled={isSubmitting} onClick={() => onDecide('approved')}>
          {isSubmitting && decision === 'approved' && <Spinner data-icon='inline-start' />}
          {t('chat_action_approve')}
        </Button>
      </div>
    </>
  );
}

// Intentions: what the agent is waiting on — its questions and the actions it asks for (approve the spec...)
// — one at a time, in place of the chat input (the BE won't take text until they're answered or dismissed).
// Several pending calls run as one sequence and are submitted together once, at the end (the BE wants
// everything pending answered in one go). The X dismisses from the current step on, which hands chat mode
// back without a reply.
// Mount with a key made of the calls' ids, so a new set starts from a clean form.
// Ways out of questions besides answering: "Previous question" (on the first step of the set, when an
// earlier question was answered) and "Skip questions & build now" both dismiss from here and then say so in
// the chat, in the user's own words, so the agent hears what they want. The "back" inside a set just steps
// back, nothing's sent yet.
export default function InteractionPanel({ interactions, onSubmit, onDismissAndSay, answeredQuestions, specDocNames }: {
  // The pending `ask_user` / `request_actions` calls, in the order the agent made them.
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
  const items = flattenInteractionItems(interactions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<InteractionDraft[]>(() => _.map(items, getEmptyDraft));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);

  const item = items[currentIndex];
  const isLastItem = currentIndex === _.size(items) - 1;
  // Only meaningful on a question step; the question UI below reads these.
  const question = item.kind === 'question' ? item.question : null;
  const draft = drafts[currentIndex] as QuestionDraft;
  const canAdvance = !!question && isQuestionDraftComplete(question, draft) && !isSubmitting;

  function replaceCurrentDraft(nextDraft: InteractionDraft) {
    return _.map(drafts, (existing, index) => (index === currentIndex ? nextDraft : existing));
  }

  async function submitAnswers(answers: InteractionAnswer[]) {
    setIsSubmitting(true);
    const isSent = await onSubmit(answers);
    // Only reached usefully on failure — on success the panel is on its way out.
    if (!isSent) {
      setIsSubmitting(false);
    }
  }

  // Dismisses from the current step on (earlier ones in this set still count), then says `text`.
  async function dismissAndSay(text: string) {
    setIsSkipConfirmOpen(false);
    setIsSubmitting(true);
    const isSent = await onDismissAndSay(buildSubmissionAnswers(interactions, drafts, { abortedAtIndex: currentIndex }), text);
    if (!isSent) {
      setIsSubmitting(false);
    }
  }

  const dismissFromHere = () => submitAnswers(buildSubmissionAnswers(interactions, drafts, { abortedAtIndex: currentIndex }));
  const previousAnsweredQuestion = _.last(answeredQuestions);
  const encouragementKey = question && _pickEncouragementKey(_.size(answeredQuestions) + currentIndex, specDocNames);

  // Moves on with `nextDrafts` (the drafts as of this step being done), or submits them all on the last step.
  function advanceWith(nextDrafts: InteractionDraft[]) {
    setDrafts(nextDrafts);
    if (isLastItem) {
      submitAnswers(buildSubmissionAnswers(interactions, nextDrafts));
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function advance() {
    if (canAdvance) {
      advanceWith(drafts);
    }
  }

  return (
    <div
      data-component='interaction-panel'
      data-interactionids={_.map(interactions, 'id').join(',')}
      data-stepindex={currentIndex}
      className='flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs animate-in fade-in-0 slide-in-from-bottom-1 dark:bg-input/30'
    >
      <div className='flex items-center justify-between gap-3'>
        <span className={_STEP_LABEL_CLASS}>
          {question
            ? t('chat_question_progress', { current: currentIndex + 1, total: _.size(items) })
            : t('chat_action_label')}
        </span>
        <Button
          variant='ghost'
          size='icon-xs'
          disabled={isSubmitting}
          aria-label={t('chat_question_dismiss')}
          title={t('chat_question_dismiss')}
          onClick={dismissFromHere}
        >
          <XIcon />
        </Button>
      </div>

      {item.kind === 'action' && (
        <ActionStep
          action={item.action}
          decision={(drafts[currentIndex] as ActionDraft).decision}
          isSubmitting={isSubmitting}
          hasBack={currentIndex > 0}
          onBack={() => setCurrentIndex(currentIndex - 1)}
          onDecide={decision => advanceWith(replaceCurrentDraft({ decision }))}
          onSkip={dismissFromHere}
        />
      )}

      {question && (
        <>
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
                  {_.map(getQuestionOptions(question), option => (
                    <label key={option.label} data-option={option.label} className={_OPTION_ROW_CLASS}>
                      <Checkbox
                        checked={_.includes(draft.selected, option.label)}
                        disabled={isSubmitting}
                        onCheckedChange={() => setDrafts(replaceCurrentDraft({ ...draft, selected: _.xor(draft.selected, [option.label]) }))}
                      />
                      <OptionText label={option.label} description={option.description} />
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
                  onValueChange={value => setDrafts(replaceCurrentDraft({ selected: [value as string], custom: '' }))}
                  className='gap-1.5'
                >
                  {_.map(getQuestionOptions(question), option => (
                    <label key={option.label} data-option={option.label} className={_OPTION_ROW_CLASS}>
                      <RadioGroupItem value={option.label} disabled={isSubmitting} />
                      <OptionText label={option.label} description={option.description} />
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
                onChange={e => setDrafts(replaceCurrentDraft(question.multi_select
                  ? { ...draft, custom: e.target.value }
                  : { custom: e.target.value, selected: [] }))}
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
                {t(isLastItem ? 'chat_question_submit' : 'chat_question_next')}
              </Button>
            </div>
          </div>
        </>
      )}

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
