import _ from 'lodash';

import type { AskUserQuestion, InteractionResult } from 'src/types/chat';

// Intentions: the rules for answering the agent's `ask_user` questions — what counts as a complete answer,
// and turning the form's drafts into the submission's `results`. All [Pure].
// References: validated server-side by vib3-backend's services/agent/interactions.py (validate_question_results).

// What the user has entered for one question while filling the form. `custom` is the raw text input.
export type QuestionDraft = { selected: string[]; custom: string };

const EMPTY_QUESTION_DRAFT: QuestionDraft = { selected: [], custom: '' };

function _toSubmittedValue(question: AskUserQuestion, draft: QuestionDraft) {
  const custom = _.trim(draft.custom);
  return { selected: draft.selected, custom: question.allow_custom && custom ? custom : null };
}

// Single-select needs exactly one answer (an option or custom text); multi-select takes anything,
// zero options included.
function isQuestionDraftComplete(question: AskUserQuestion, draft: QuestionDraft) {
  const value = _toSubmittedValue(question, draft);
  return question.multi_select || _.size(value.selected) + (value.custom ? 1 : 0) === 1;
}

// The `results` array for a submission. Without `abortedAtIndex` every question is submitted; with it,
// the ones before are submitted, that one aborted and the rest untouched.
function buildInteractionResults(
  questions: AskUserQuestion[],
  drafts: QuestionDraft[],
  options: { abortedAtIndex?: number } = {},
): InteractionResult[] {
  const { abortedAtIndex = Infinity } = options;
  return _.map(questions, (question, index): InteractionResult => {
    if (index < abortedAtIndex) {
      return { status: 'submitted', value: _toSubmittedValue(question, drafts[index] || EMPTY_QUESTION_DRAFT) };
    }
    return index === abortedAtIndex ? { status: 'aborted' } : { status: 'untouched' };
  });
}

export {
  EMPTY_QUESTION_DRAFT,
  buildInteractionResults,
  isQuestionDraftComplete,
};
